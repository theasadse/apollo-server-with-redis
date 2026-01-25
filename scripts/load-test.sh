#!/bin/bash

# Load Testing Script for Apollo GraphQL Server
# This script generates traffic to trigger HPA autoscaling

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
ENDPOINT="http://localhost:30080/graphql"
DURATION=${1:-60}  # Default 60 seconds
CONCURRENT=${2:-50}  # Default 50 concurrent requests

echo -e "${BLUE}=== Apollo Server Load Test ===${NC}"
echo -e "${YELLOW}Endpoint:${NC} $ENDPOINT"
echo -e "${YELLOW}Duration:${NC} $DURATION seconds"
echo -e "${YELLOW}Concurrent:${NC} $CONCURRENT requests"
echo ""

# Check if metrics-server is installed
echo -e "${BLUE}Checking metrics-server...${NC}"
if kubectl get deployment metrics-server -n kube-system &> /dev/null; then
    echo -e "${GREEN}✓ metrics-server is installed${NC}"
else
    echo -e "${RED}✗ metrics-server not found${NC}"
    echo -e "${YELLOW}Installing metrics-server...${NC}"
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    kubectl patch deployment metrics-server -n kube-system --type='json' -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
    echo -e "${YELLOW}Waiting for metrics-server to be ready...${NC}"
    kubectl wait --for=condition=available --timeout=60s deployment/metrics-server -n kube-system
    sleep 10
fi

# Check if HPA is configured
echo -e "\n${BLUE}Checking HPA configuration...${NC}"
if kubectl get hpa apollo-hpa &> /dev/null; then
    echo -e "${GREEN}✓ HPA is configured${NC}"
    kubectl get hpa apollo-hpa
else
    echo -e "${RED}✗ HPA not found. Applying configuration...${NC}"
    kubectl apply -f k8s/apollo-hpa.yaml
    sleep 5
fi

# Show current pod status
echo -e "\n${BLUE}Current pod status:${NC}"
kubectl get pods -l app=apollo

# GraphQL queries for testing
QUERIES=(
    '{"query":"{users(limit:100){data{id name email createdAt}}}"}' 
    '{"query":"{userCount}"}'
    '{"query":"{posts(limit:50){data{id title content userId createdAt}}}"}' 
    '{"query":"mutation{createPost(input:{title:\"Load Test Post\",content:\"Testing autoscaling\",userId:\"00000000-0000-0000-0000-000000000001\"}){id title}}"}'
)

# Function to send requests using curl
load_test_curl() {
    echo -e "\n${BLUE}Starting load test with curl (Method 1)...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
    
    local end_time=$((UNIX_TIMESTAMP + DURATION))
    local count=0
    
    # Start monitoring in background
    (
        watch -n 2 "kubectl get hpa apollo-hpa && echo '' && kubectl get pods -l app=apollo"
    ) &
    local watch_pid=$!
    
    # Generate load
    for i in $(seq 1 $CONCURRENT); do
        (
            while [ $(date +%s) -lt $end_time ]; do
                local query=${QUERIES[$RANDOM % ${#QUERIES[@]}]}
                curl -s -X POST "$ENDPOINT" \
                    -H "Content-Type: application/json" \
                    -d "$query" > /dev/null
                sleep 0.1
            done
        ) &
    done
    
    # Wait for duration
    sleep $DURATION
    
    # Kill background processes
    kill $watch_pid 2>/dev/null || true
    pkill -P $$ 2>/dev/null || true
    
    echo -e "\n${GREEN}Load test completed!${NC}"
}

# Function to check for load testing tools
check_tool() {
    local tool=$1
    if command -v $tool &> /dev/null; then
        echo -e "${GREEN}✓ $tool is installed${NC}"
        return 0
    else
        echo -e "${YELLOW}✗ $tool not found${NC}"
        return 1
    fi
}

# Check for advanced load testing tools
echo -e "\n${BLUE}Checking for load testing tools...${NC}"
HAS_AB=false
HAS_HEY=false
HAS_K6=false

check_tool "ab" && HAS_AB=true
check_tool "hey" && HAS_HEY=true
check_tool "k6" && HAS_K6=true

# Offer installation suggestions
if ! $HAS_AB && ! $HAS_HEY && ! $HAS_K6; then
    echo -e "\n${YELLOW}For better load testing, install one of these tools:${NC}"
    echo -e "  Apache Bench: ${BLUE}brew install httpd${NC} (includes ab)"
    echo -e "  Hey:          ${BLUE}brew install hey${NC}"
    echo -e "  K6:           ${BLUE}brew install k6${NC}"
    echo -e "\n${YELLOW}Falling back to curl-based load test...${NC}"
    load_test_curl
    exit 0
fi

# Choose best available tool
echo -e "\n${BLUE}Select load testing method:${NC}"
echo "1) curl (built-in, simple)"
if $HAS_AB; then
    echo "2) Apache Bench (ab) - recommended"
fi
if $HAS_HEY; then
    echo "3) Hey - modern, easy to use"
fi
if $HAS_K6; then
    echo "4) K6 - advanced, scriptable"
fi
echo ""
read -p "Choice (default: 1): " choice
choice=${choice:-1}

case $choice in
    2)
        if $HAS_AB; then
            echo -e "\n${BLUE}Starting load test with Apache Bench...${NC}"
            echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
            
            # Start monitoring
            kubectl get hpa apollo-hpa --watch &
            local watch_pid=$!
            
            # Run ab test
            ab -n 10000 -c $CONCURRENT -t $DURATION \
                -p <(echo '{"query":"{users(limit:100){data{id name}}}"}') \
                -T "application/json" \
                "$ENDPOINT"
            
            kill $watch_pid 2>/dev/null || true
        else
            echo -e "${RED}Apache Bench not installed. Using curl...${NC}"
            load_test_curl
        fi
        ;;
    3)
        if $HAS_HEY; then
            echo -e "\n${BLUE}Starting load test with Hey...${NC}"
            echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
            
            # Start monitoring
            kubectl get hpa apollo-hpa --watch &
            local watch_pid=$!
            
            # Run hey test
            hey -z ${DURATION}s -c $CONCURRENT -m POST \
                -H "Content-Type: application/json" \
                -d '{"query":"{users(limit:100){data{id name email}}}"}' \
                "$ENDPOINT"
            
            kill $watch_pid 2>/dev/null || true
        else
            echo -e "${RED}Hey not installed. Using curl...${NC}"
            load_test_curl
        fi
        ;;
    4)
        if $HAS_K6; then
            echo -e "\n${BLUE}Starting load test with K6...${NC}"
            
            # Create K6 script
            cat > /tmp/k6-load-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export const options = {
    vus: __ENV.CONCURRENT || 50,
    duration: __ENV.DURATION + 's' || '60s',
};

const queries = [
    '{"query":"{users(limit:100){data{id name email}}}"}',
    '{"query":"{userCount}"}',
    '{"query":"{posts(limit:50){data{id title}}}"}',
];

export default function () {
    const query = queries[Math.floor(Math.random() * queries.length)];
    const response = http.post(
        __ENV.ENDPOINT || 'http://localhost:30080/graphql',
        query,
        { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(response, {
        'status is 200': (r) => r.status === 200,
    });
}
EOF
            
            # Start monitoring
            kubectl get hpa apollo-hpa --watch &
            local watch_pid=$!
            
            # Run k6 test
            ENDPOINT=$ENDPOINT CONCURRENT=$CONCURRENT DURATION=$DURATION \
                k6 run /tmp/k6-load-test.js
            
            kill $watch_pid 2>/dev/null || true
            rm /tmp/k6-load-test.js
        else
            echo -e "${RED}K6 not installed. Using curl...${NC}"
            load_test_curl
        fi
        ;;
    *)
        load_test_curl
        ;;
esac

# Show final status
echo -e "\n${BLUE}=== Final Status ===${NC}"
echo -e "\n${YELLOW}HPA Status:${NC}"
kubectl get hpa apollo-hpa

echo -e "\n${YELLOW}Pod Status:${NC}"
kubectl get pods -l app=apollo

echo -e "\n${YELLOW}Pod Resource Usage:${NC}"
kubectl top pods -l app=apollo 2>/dev/null || echo "Run 'kubectl top pods' after a few seconds"

echo -e "\n${GREEN}✓ Load test completed!${NC}"
echo -e "${BLUE}Monitor scaling with:${NC} watch kubectl get pods -l app=apollo"
