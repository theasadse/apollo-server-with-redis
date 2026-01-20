# 🚀 Load-Balanced Apollo Server Setup - Quick Reference Guide

## Overview

Your Apollo Server project is now configured to run **3 instances** behind an **Nginx load balancer** with:

- Shared PostgreSQL database
- Shared Redis cache
- Automatic request tracking
- Visual load balancer dashboard
- Health checks and failover

## Quick Start (3 Steps)

### Step 1: Initialize Setup

```bash
chmod +x setup.sh
./setup.sh
```

### Step 2: Start All Services

```bash
./start-load-balanced.sh
```

Or use docker-compose directly:

```bash
docker-compose up --build
```

### Step 3: Test the Load Balancer

```bash
./test-load-balancer.sh 20
```

This will send 20 requests and show you the distribution across instances.

---

## 📊 Access Points

| Service                     | URL                             | Purpose                                |
| --------------------------- | ------------------------------- | -------------------------------------- |
| **Load Balancer Dashboard** | http://localhost:8080/lb-status | Visual status of all instances         |
| **GraphQL (via LB)**        | http://localhost:8080/graphql   | GraphQL endpoint through load balancer |
| **Instance 1**              | http://localhost:4001/graphql   | Direct access to instance 1            |
| **Instance 2**              | http://localhost:4002/graphql   | Direct access to instance 2            |
| **Instance 3**              | http://localhost:4003/graphql   | Direct access to instance 3            |
| **Health Check**            | http://localhost:8080/health    | LB health status                       |

---

## 🔍 Request Tracking

Every request is logged with:

- **Instance ID**: Which server handled it
- **Request ID**: Unique identifier
- **Duration**: Response time in milliseconds
- **Status Code**: HTTP response code

### Example Console Output:

```
[2025-01-20T12:34:56.789Z] [instance-1] POST /graphql - Request ID: instance-1-1705759496789-abc123xyz
[2025-01-20T12:34:57.123Z] [instance-1] POST /graphql - Status: 200 - Duration: 334ms
```

### Response Headers:

Every response includes:

```
X-Instance-ID: apollo-server-1:4001
X-Request-ID: instance-1-1705759496789-abc123xyz
```

---

## 📈 Load Balancing Details

**Algorithm**: Least Connections

- Distributes new requests to the instance with fewest active connections
- Ensures balanced load across all instances
- Fair and efficient

**Health Checking**:

- Checks every 5-10 seconds
- Marks unhealthy instances as down
- Automatically removes them from rotation
- Re-adds when they recover

---

## 🧪 Testing Load Distribution

### Quick Test (10 requests):

```bash
./test-load-balancer.sh 10
```

### Extended Test (50 requests):

```bash
./test-load-balancer.sh 50
```

### Manual Request (with curl):

```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

---

## 📊 Monitoring & Logs

### View All Logs:

```bash
docker-compose logs -f
```

### View Specific Service:

```bash
docker-compose logs -f apollo-server-1
docker-compose logs -f apollo-server-2
docker-compose logs -f apollo-server-3
docker-compose logs -f nginx-lb
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Container Status:

```bash
docker-compose ps
```

### Resource Usage:

```bash
docker stats apollo-server-1 apollo-server-2 apollo-server-3
```

---

## 🛑 Stopping & Cleanup

### Stop All Services (keep data):

```bash
docker-compose down
```

### Stop & Remove Everything:

```bash
docker-compose down -v
```

### Restart Services:

```bash
docker-compose restart
```

---

## 📁 File Structure

```
.
├── docker-compose.yml          # Multi-instance configuration
├── nginx.conf                  # Load balancer config
├── Dockerfile                  # Container image
├── src/
│   ├── index.ts               # Apollo Server with tracking middleware
│   ├── schema.ts
│   ├── resolvers/
│   ├── utils/
│   │   └── redis.ts
│   └── db/
├── LOAD_BALANCER_SETUP.md      # Detailed documentation
├── start-load-balanced.sh      # Startup script
├── test-load-balancer.sh       # Testing script
├── setup.sh                    # Initial setup
└── .env                        # Environment variables
```

---

## 🔧 Customization

### Add a 4th Instance

**1. Update docker-compose.yml:**

```yaml
apollo-server-4:
  build:
    context: .
    dockerfile: Dockerfile
  container_name: apollo-server-4
  environment:
    PORT: 4004
    INSTANCE_ID: "instance-4"
    REDIS_URL: redis://redis:6379
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/apollo_db
  ports:
    - "4004:4004"
  depends_on:
    redis:
      condition: service_healthy
    postgres:
      condition: service_healthy
  networks:
    - apollo-network
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:4004/health"]
    interval: 5s
    timeout: 3s
    retries: 5
```

**2. Update nginx.conf** - Add to upstream block:

```nginx
server apollo-server-4:4004 weight=1 max_fails=3 fail_timeout=30s;
```

**3. Restart:**

```bash
docker-compose up --build
```

---

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Verify Docker is running
docker ps

# Try rebuilding
docker-compose down
docker-compose up --build
```

### Can't Connect to Load Balancer

```bash
# Check if service is running
curl http://localhost:8080/health

# Check port availability
lsof -i :8080

# View nginx logs
docker-compose logs nginx-lb
```

### Instance Not Responding

```bash
# Check instance health
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health

# Check instance logs
docker-compose logs apollo-server-1

# Restart specific instance
docker-compose restart apollo-server-1
```

### Database Connection Issues

```bash
# Test PostgreSQL
docker exec apollo-postgres psql -U postgres -c "SELECT 1"

# View postgres logs
docker-compose logs postgres
```

### Redis Connection Issues

```bash
# Test Redis
docker exec apollo-redis redis-cli ping

# View redis logs
docker-compose logs redis
```

---

## 📊 Example Test Results

Running `./test-load-balancer.sh 30` might show:

```
Request Distribution Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━
  apollo-server-1:4001: 10 requests (33%)
  apollo-server-2:4002: 10 requests (33%)
  apollo-server-3:4003: 10 requests (34%)

Total: 30/30 requests
Distribution is BALANCED ✓
```

---

## 📚 Additional Resources

- Full documentation: [LOAD_BALANCER_SETUP.md](./LOAD_BALANCER_SETUP.md)
- Docker Compose docs: https://docs.docker.com/compose/
- Nginx docs: https://nginx.org/en/docs/
- Apollo Server docs: https://www.apollographql.com/docs/apollo-server/

---

## ✅ Verification Checklist

After starting services:

- [ ] Can access load balancer dashboard: http://localhost:8080/lb-status
- [ ] Can access GraphQL via LB: http://localhost:8080/graphql
- [ ] Health check passes: http://localhost:8080/health
- [ ] All 3 instances are healthy in dashboard
- [ ] Requests are distributed across instances
- [ ] Response headers show X-Instance-ID
- [ ] Logs show request tracking

---

**Created**: January 20, 2025
**Environment**: Ubuntu 24.04.3 LTS with Docker
