#!/bin/bash

# ============================================================================
# Kubernetes Load Test - 1 Million Requests
# ============================================================================
# This script:
# 1. Sets up the Kubernetes environment
# 2. Sends 1 million requests to the Apollo server
# 3. Monitors pod autoscaling in real-time
# ============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Cleanup function for graceful shutdown
cleanup() {
    echo ""
    echo -e "${YELLOW}⚠️  Stopping load test...${NC}"
    
    # Kill background processes
    kill $PROGRESS_PID 2>/dev/null || true
    kill $MONITOR_PID 2>/dev/null || true
    
    # Kill all curl workers
    pkill -P $$ 2>/dev/null || true
    
    # Clean up progress file
    rm -f /tmp/load-test-progress.txt
    
    echo -e "${GREEN}✓ Load test stopped${NC}"
    echo -e "${CYAN}To view final status, run:${NC}"
    echo -e "  ${YELLOW}kubectl get pods -l app=apollo${NC}"
    echo -e "  ${YELLOW}kubectl get hpa apollo-hpa${NC}"
    exit 0
}

# Trap Ctrl+C and other termination signals
trap cleanup INT TERM

# Configuration
ENDPOINT="http://localhost:30080/graphql"
TOTAL_REQUESTS=1000000
CONCURRENT_WORKERS=100
REQUESTS_PER_WORKER=$((TOTAL_REQUESTS / CONCURRENT_WORKERS))

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Kubernetes Load Test - 1 Million Requests                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Configuration:${NC}"
echo -e "  Total Requests:       ${YELLOW}1,000,000${NC}"
echo -e "  Concurrent Workers:   ${YELLOW}${CONCURRENT_WORKERS}${NC}"
echo -e "  Requests per Worker:  ${YELLOW}${REQUESTS_PER_WORKER}${NC}"
echo -e "  Endpoint:             ${YELLOW}${ENDPOINT}${NC}"
echo ""

# ============================================================================
# STEP 1: Prerequisites Check
# ============================================================================
echo -e "${BLUE}[Step 1/7] Checking Prerequisites...${NC}"

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}✗ kubectl is not installed${NC}"
    echo -e "${YELLOW}Install it from: https://kubernetes.io/docs/tasks/tools/${NC}"
    exit 1
fi
echo -e "${GREEN}✓ kubectl is installed${NC}"

# Check if cluster is running
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}✗ Kubernetes cluster is not running${NC}"
    echo -e "${YELLOW}Start Docker Desktop Kubernetes or Minikube${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Kubernetes cluster is running${NC}"

# Check if Docker image exists
if ! docker images | grep -q "apollo-server-with-redis-apollo-server"; then
    echo -e "${YELLOW}⚠ Docker image not found. Building...${NC}"
    docker build -t apollo-server-with-redis-apollo-server:latest .
    echo -e "${GREEN}✓ Docker image built${NC}"
else
    echo -e "${GREEN}✓ Docker image exists${NC}"
fi

echo ""

# ============================================================================
# STEP 2: Deploy PostgreSQL and Redis (if not running)
# ============================================================================
echo -e "${BLUE}[Step 2/7] Setting up Database and Redis...${NC}"

# Check if PostgreSQL is running
if ! docker ps | grep -q "postgres"; then
    echo -e "${YELLOW}Starting PostgreSQL...${NC}"
    docker run -d \
        --name postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=apollo_db \
        -p 5438:5432 \
        postgres:15-alpine
    sleep 5
    echo -e "${GREEN}✓ PostgreSQL started${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL is already running${NC}"
fi

# Check if Redis is running
if ! docker ps | grep -q "redis"; then
    echo -e "${YELLOW}Starting Redis...${NC}"
    docker run -d \
        --name redis \
        -p 6379:6379 \
        redis:7-alpine
    sleep 2
    echo -e "${GREEN}✓ Redis started${NC}"
else
    echo -e "${GREEN}✓ Redis is already running${NC}"
fi

echo ""

# ============================================================================
# STEP 3: Deploy Application to Kubernetes
# ============================================================================
echo -e "${BLUE}[Step 3/7] Deploying to Kubernetes...${NC}"

# Apply all manifests
echo -e "${CYAN}Applying Kubernetes manifests...${NC}"
kubectl apply -f k8s/apollo-deployment.yaml
kubectl apply -f k8s/apollo-service.yaml
kubectl apply -f k8s/nginx-configmap.yaml
kubectl apply -f k8s/nginx-deployment.yaml
kubectl apply -f k8s/nginx-service.yaml

# Wait for deployments to be ready
echo -e "${CYAN}Waiting for deployments to be ready...${NC}"
kubectl wait --for=condition=available --timeout=120s deployment/apollo
kubectl wait --for=condition=available --timeout=120s deployment/nginx-loadbalancer

echo -e "${GREEN}✓ Application deployed successfully${NC}"
echo ""

# ============================================================================
# STEP 4: Setup Horizontal Pod Autoscaler (HPA)
# ============================================================================
echo -e "${BLUE}[Step 4/7] Setting up Autoscaling...${NC}"

# Check if metrics-server is installed
if ! kubectl get deployment metrics-server -n kube-system &> /dev/null; then
    echo -e "${YELLOW}Installing metrics-server...${NC}"
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    
    # Patch for local development (Docker Desktop/Minikube)
    kubectl patch deployment metrics-server -n kube-system --type='json' \
        -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
    
    echo -e "${CYAN}Waiting for metrics-server to be ready...${NC}"
    kubectl wait --for=condition=available --timeout=120s deployment/metrics-server -n kube-system
    sleep 15
    echo -e "${GREEN}✓ metrics-server installed${NC}"
else
    echo -e "${GREEN}✓ metrics-server is already installed${NC}"
fi

# Apply HPA configuration
echo -e "${CYAN}Applying HPA configuration...${NC}"
kubectl apply -f k8s/apollo-hpa.yaml
sleep 5

echo -e "${GREEN}✓ Autoscaling configured${NC}"
echo ""

# Show current status
echo -e "${CYAN}Current Status:${NC}"
kubectl get hpa apollo-hpa
echo ""
kubectl get pods -l app=apollo
echo ""

# ============================================================================
# STEP 5: Create Monitoring Terminal Sessions
# ============================================================================
echo -e "${BLUE}[Step 5/7] Starting Monitoring...${NC}"

# Create log directory
mkdir -p logs
LOG_FILE="logs/load-test-$(date +%Y%m%d-%H%M%S).log"

# Start monitoring in background
(
    echo "=== Pod Scaling Monitor ===" > "$LOG_FILE"
    echo "Started at: $(date)" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    
    while true; do
        echo "=== $(date) ===" >> "$LOG_FILE"
        kubectl get hpa apollo-hpa >> "$LOG_FILE" 2>&1 || true
        echo "" >> "$LOG_FILE"
        kubectl get pods -l app=apollo >> "$LOG_FILE" 2>&1 || true
        echo "" >> "$LOG_FILE"
        kubectl top pods -l app=apollo >> "$LOG_FILE" 2>&1 || true
        echo "----------------------------------------" >> "$LOG_FILE"
        sleep 5
    done
) &
MONITOR_PID=$!

echo -e "${GREEN}✓ Monitoring started (logging to: ${LOG_FILE})${NC}"
echo ""
echo -e "${CYAN}💡 TIP: Open a new terminal to watch detailed metrics:${NC}"
echo -e "  ${YELLOW}kubectl get hpa apollo-hpa --watch${NC}"
echo -e "  ${YELLOW}kubectl get pods -l app=apollo --watch${NC}"
echo -e "  ${YELLOW}kubectl top pods -l app=apollo --watch${NC}"
echo ""

# ============================================================================
# STEP 6: Execute Load Test - 1 Million Requests
# ============================================================================
echo -e "${BLUE}[Step 6/7] Starting Load Test - 1 Million Requests...${NC}"
echo ""
echo -e "${YELLOW}This will take several minutes. Monitor the pods scaling up!${NC}"
echo ""

# GraphQL queries for testing
QUERIES=(
    '{"query":"{users(limit:50){data{id name email}}}"}' 
    '{"query":"{userCount}"}'
    '{"query":"{posts(limit:20){data{id title userId}}}"}' 
    '{"query":"{users(limit:10){data{id name}}}"}' 
    '{"query":"mutation{createPost(input:{title:\\"Test\\",content:\\"Load\\",userId:\\"00000000-0000-0000-0000-000000000001\\"}){id}}"}'
)

# Progress tracking
COMPLETED=0
START_TIME=$(date +%s)

# Function to send requests
send_requests() {
    local worker_id=$1
    local requests=$2
    local query_index=0
    
    for ((i=1; i<=requests; i++)); do
        query=${QUERIES[$query_index]}
        curl -s -X POST "$ENDPOINT" \
            -H "Content-Type: application/json" \
            -d "$query" > /dev/null 2>&1 || true
        
        # Rotate through queries
        query_index=$(( (query_index + 1) % ${#QUERIES[@]} ))
        
        # Update progress every 1000 requests
        if (( i % 1000 == 0 )); then
            echo "$worker_id:$i" >> /tmp/load-test-progress.txt
        fi
    done
}

# Progress monitor with real-time pod count
(
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}                    REAL-TIME LOAD TEST METRICS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    while true; do
        if [ -f /tmp/load-test-progress.txt ]; then
            COMPLETED=$(wc -l < /tmp/load-test-progress.txt | tr -d ' ')
            COMPLETED=$((COMPLETED * 1000))
            ELAPSED=$(($(date +%s) - START_TIME))
            RPS=$((COMPLETED / (ELAPSED + 1)))
            PERCENT=$((COMPLETED * 100 / TOTAL_REQUESTS))
            
            # Get current pod count
            POD_COUNT=$(kubectl get pods -l app=apollo --no-headers 2>/dev/null | grep -c "Running" || echo "0")
            
            # Get HPA current replicas
            HPA_CURRENT=$(kubectl get hpa apollo-hpa -o jsonpath='{.status.currentReplicas}' 2>/dev/null || echo "0")
            HPA_DESIRED=$(kubectl get hpa apollo-hpa -o jsonpath='{.status.desiredReplicas}' 2>/dev/null || echo "0")
            
            # Calculate remaining
            REMAINING=$((TOTAL_REQUESTS - COMPLETED))
            ETA=$((REMAINING / (RPS + 1)))
            
            # Clear previous lines and display dashboard
            tput cuu 6 2>/dev/null || true
            tput ed 2>/dev/null || true
            
            echo -e "${CYAN}📊 Requests:${NC}       ${YELLOW}${COMPLETED} / 1,000,000${NC} (${PERCENT}%) | Remaining: ${YELLOW}${REMAINING}${NC}"
            echo -e "${CYAN}⚡ Rate:${NC}           ${YELLOW}${RPS} requests/second${NC}"
            echo -e "${CYAN}⏱️  Time:${NC}           Elapsed: ${YELLOW}${ELAPSED}s${NC} | ETA: ${YELLOW}${ETA}s${NC}"
            echo -e "${CYAN}🚀 Pods:${NC}           ${YELLOW}${POD_COUNT} running${NC}"
            echo -e "${CYAN}📈 HPA:${NC}            Current: ${YELLOW}${HPA_CURRENT}${NC} | Desired: ${YELLOW}${HPA_DESIRED}${NC}"
            echo ""
        fi
        sleep 2
    done
) &
PROGRESS_PID=$!

# Clear progress file
rm -f /tmp/load-test-progress.txt
touch /tmp/load-test-progress.txt

echo -e "${CYAN}Launching ${CONCURRENT_WORKERS} workers...${NC}"
echo ""

# Launch workers
for i in $(seq 1 $CONCURRENT_WORKERS); do
    send_requests $i $REQUESTS_PER_WORKER &
done

# Wait for all workers to complete
wait

# Stop progress monitor
kill $PROGRESS_PID 2>/dev/null || true

END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

# Clear progress display
tput cuu 8 2>/dev/null || true
tput ed 2>/dev/null || true

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║               ✓ LOAD TEST COMPLETED!                           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📊 Total Requests:${NC}    ${YELLOW}${TOTAL_REQUESTS}${NC}"
echo -e "${CYAN}⏱️  Total Time:${NC}        ${YELLOW}${TOTAL_TIME} seconds${NC} (${YELLOW}$((TOTAL_TIME / 60))m $((TOTAL_TIME % 60))s${NC})"
echo -e "${CYAN}⚡ Average RPS:${NC}       ${YELLOW}$((TOTAL_REQUESTS / TOTAL_TIME))${NC} requests/second"
echo ""

# ============================================================================
# STEP 7: Show Results and Cleanup
# ============================================================================
echo -e "${BLUE}[Step 7/7] Results Summary${NC}"
echo ""

# Stop monitoring
kill $MONITOR_PID 2>/dev/nStatus:${NC}"
POD_COUNT=$(kubectl get pods -l app=apollo --no-headers | wc -l | tr -d ' ')
POD_RUNNING=$(kubectl get pods -l app=apollo --no-headers | grep -c "Running" || echo "0")
echo -e "  Total: ${YELLOW}${POD_COUNT} pods${NC} (${GREEN}${POD_RUNNING} running${NC})"
echo ""
kubectl get pods -l app=apollo -o wideus:${NC}"
kubectl get hpa apollo-hpa
echo ""

echo -e "${CYAN}Final Pod Count:${NC}"
POD_COUNT=$(kubectl get pods -l app=apollo --no-headers | wc -l | tr -d ' ')
echo -e "  ${YELLOW}${POD_COUNT} pods${NC} are currently running"
kubectl get pods -l app=apollo
echo ""

echo -e "${CYAN}Pod Resource Usage:${NC}"
kubectl top pods -l app=apollo 2>/dev/null || echo "Metrics not ready yet"
echo ""

echo -e "${CYAN}Scaling Events:${NC}"
kubectl get events --sort-by='.lastTimestamp' | grep -i "horizontal\|scaled" | tail -20
echo ""

# Show log file location
echo -e "${GREEN}✓ Complete monitoring log saved to: ${YELLOW}${LOG_FILE}${NC}"
echo ""

# Cleanup
rm -f /tmp/load-test-progress.txt

# ============================================================================
# Helpful Commands
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Helpful Commands                                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Monitor pods:${NC}"
echo -e "  ${YELLOW}watch kubectl get pods -l app=apollo${NC}"
echo ""
echo -e "${CYAN}View HPA status:${NC}"
echo -e "  ${YELLOW}kubectl get hpa apollo-hpa --watch${NC}"
echo ""
echo -e "${CYAN}View pod metrics:${NC}"
echo -e "  ${YELLOW}kubectl top pods -l app=apollo${NC}"
echo ""
echo -e "${CYAN}View scaling events:${NC}"
echo -e "  ${YELLOW}kubectl describe hpa apollo-hpa${NC}"
echo ""
echo -e "${CYAN}View application logs:${NC}"
echo -e "  ${YELLOW}kubectl logs -l app=apollo --tail=100 -f${NC}"
echo ""
echo -e "${CYAN}Scale down manually (after testing):${NC}"
echo -e "  ${YELLOW}kubectl scale deployment apollo --replicas=2${NC}"
echo ""
echo -e "${CYAN}View monitoring log:${NC}"
echo -e "  ${YELLOW}tail -f ${LOG_FILE}${NC}"
echo ""
echo -e "${CYAN}Cleanup everything:${NC}"
echo -e "  ${YELLOW}kubectl delete -f k8s/${NC}"
echo -e "  ${YELLOW}docker stop postgres redis && docker rm postgres redis${NC}"
echo ""
echo -e "${GREEN}✓ Load test complete! Pods will scale down automatically in ~5 minutes.${NC}"
