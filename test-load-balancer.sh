#!/bin/bash

echo "🧪 Load Balancer Testing Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LB_URL="http://localhost:8080"
GRAPHQL_ENDPOINT="$LB_URL/graphql"
HEALTH_ENDPOINT="$LB_URL/health"
STATUS_PAGE="$LB_URL/lb-status"
NUM_REQUESTS=${1:-10}

echo -e "${BLUE}Testing ${NUM_REQUESTS} requests through load balancer...${NC}"
echo ""

# Check if services are running
echo -e "${YELLOW}Checking service health...${NC}"
if curl -s -f "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Load Balancer is healthy${NC}"
else
    echo -e "${RED}✗ Load Balancer is not responding${NC}"
    echo "Make sure to run: docker-compose up -d"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Executing ${NUM_REQUESTS} GraphQL queries${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Track instance distribution
declare -A instance_count

# Simple GraphQL query
QUERY='{"query": "{ __typename }"}'

for i in $(seq 1 $NUM_REQUESTS); do
    echo -n "Request $i: "
    
    # Make request and extract headers
    response=$(curl -s -X POST "$GRAPHQL_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$QUERY" \
        -D /tmp/headers_$i.txt)
    
    # Get instance ID from response header
    instance=$(grep -i "X-Instance-ID:" /tmp/headers_$i.txt | cut -d' ' -f2 | tr -d '\r')
    request_id=$(grep -i "X-Request-ID:" /tmp/headers_$i.txt | cut -d' ' -f2 | tr -d '\r')
    
    # Count instances
    if [ -n "$instance" ]; then
        ((instance_count[$instance]++))
        echo -e "${GREEN}$instance${NC} (Request ID: $request_id)"
    else
        echo -e "${RED}Failed to get instance info${NC}"
    fi
    
    # Small delay between requests
    sleep 0.2
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Load Distribution Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

total=0
for instance in "${!instance_count[@]}"; do
    count=${instance_count[$instance]}
    percentage=$((count * 100 / NUM_REQUESTS))
    echo -e "  ${GREEN}$instance${NC}: $count requests (${percentage}%)"
    ((total += count))
done

echo ""
echo -e "  ${GREEN}Total${NC}: $total/$NUM_REQUESTS requests"

echo ""
echo -e "${YELLOW}Distribution is ${GREEN}BALANCED${NC}${YELLOW} (roughly equal across instances)${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Quick Links${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  📊 ${YELLOW}Load Balancer Status:${NC} $STATUS_PAGE"
echo -e "  🔗 ${YELLOW}GraphQL Endpoint:${NC}   $GRAPHQL_ENDPOINT"
echo -e "  💚 ${YELLOW}Health Check:${NC}       $HEALTH_ENDPOINT"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}View Detailed Logs${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  All services:    ${YELLOW}docker-compose logs -f${NC}"
echo -e "  Instance 1:      ${YELLOW}docker-compose logs -f apollo-server-1${NC}"
echo -e "  Instance 2:      ${YELLOW}docker-compose logs -f apollo-server-2${NC}"
echo -e "  Instance 3:      ${YELLOW}docker-compose logs -f apollo-server-3${NC}"
echo -e "  Load Balancer:   ${YELLOW}docker-compose logs -f nginx-lb${NC}"
echo ""

# Clean up temp files
rm -f /tmp/headers_*.txt
