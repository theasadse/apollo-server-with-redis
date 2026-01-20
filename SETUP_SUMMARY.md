# 🎯 Load Balancer Setup Summary

## ✅ What's Been Configured

Your Apollo Server project now has:

### 1. **Multiple Server Instances** (3 instances)

- `apollo-server-1` running on port 4001
- `apollo-server-2` running on port 4002
- `apollo-server-3` running on port 4003
- Each instance is independent but shares database/cache

### 2. **Nginx Load Balancer**

- Listening on port 8080
- Using **Least Connections** algorithm for fair distribution
- Automatic health checking and failover
- Visual dashboard at `/lb-status`

### 3. **Request Tracking System**

- Every request logged with unique ID
- Instance ID included in response headers (`X-Instance-ID`)
- Response time tracking (duration in milliseconds)
- Console logging for monitoring

### 4. **Shared Infrastructure**

- PostgreSQL database (shared by all instances)
- Redis cache (shared by all instances)
- All instances see the same data

---

## 📊 Traffic Flow

```
User Request
     ↓
http://localhost:8080/graphql
     ↓
Nginx Load Balancer (Least Connections Algorithm)
     ↓
     ├─→ apollo-server-1:4001 ┐
     ├─→ apollo-server-2:4002 ├─→ Shared PostgreSQL
     └─→ apollo-server-3:4003 ┤
                               ├─→ Shared Redis

Response back to user with X-Instance-ID header
```

---

## 🚀 Getting Started

### Step 1: Run Setup (First Time Only)

```bash
./setup.sh
```

### Step 2: Start Services

```bash
./start-load-balanced.sh
```

Or directly:

```bash
docker-compose up --build
```

### Step 3: Verify It's Working

```bash
# Check load balancer is responding
curl http://localhost:8080/health

# Open dashboard in browser
http://localhost:8080/lb-status

# Test with GraphQL
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

---

## 🧪 Test Load Distribution

Run the test script with number of requests:

```bash
# Test with 20 requests
./test-load-balancer.sh 20

# Test with 50 requests
./test-load-balancer.sh 50

# Test with 100 requests
./test-load-balancer.sh 100
```

**Expected Result**: Requests should be roughly equally distributed across all 3 instances (33% each)

---

## 📊 Key Access Points

| What                        | URL                             | Use Case                                 |
| --------------------------- | ------------------------------- | ---------------------------------------- |
| **Load Balancer Dashboard** | http://localhost:8080/lb-status | See status of all instances visually     |
| **GraphQL Endpoint**        | http://localhost:8080/graphql   | Use for actual GraphQL queries/mutations |
| **Health Check**            | http://localhost:8080/health    | Monitor load balancer health             |
| **Instance 1 (Direct)**     | http://localhost:4001/graphql   | Bypass LB, test individual instance      |
| **Instance 2 (Direct)**     | http://localhost:4002/graphql   | Bypass LB, test individual instance      |
| **Instance 3 (Direct)**     | http://localhost:4003/graphql   | Bypass LB, test individual instance      |

---

## 📈 Request Tracking Example

When you make a request, you'll see in the logs:

```
[2025-01-20T08:30:45.123Z] [instance-1] POST /graphql - Request ID: instance-1-1705761045123-x7k9p2m
[2025-01-20T08:30:45.456Z] [instance-1] POST /graphql - Status: 200 - Duration: 333ms
```

And in the response headers:

```
X-Instance-ID: apollo-server-1:4001
X-Request-ID: instance-1-1705761045123-x7k9p2m
```

---

## 🔄 Load Balancing Algorithm

**Least Connections**:

- Nginx tracks the number of active connections to each instance
- New requests go to the instance with the fewest active connections
- Results in optimal load distribution

**Why This Matters**:

- Prevents one instance from being overloaded
- Ensures fair resource utilization
- Improves response times
- Provides better scalability

---

## 🛠️ Container Services

```bash
# See all running services
docker-compose ps

# View logs from all services
docker-compose logs -f

# View logs from specific service
docker-compose logs -f apollo-server-1
docker-compose logs -f nginx-lb

# Check resource usage
docker stats
```

---

## 📝 Files Created/Modified

### New Files:

- `docker-compose.yml` - Updated with 3 instances + LB
- `nginx.conf` - Load balancer configuration
- `Dockerfile` - Container image definition
- `LOAD_BALANCER_SETUP.md` - Detailed documentation
- `QUICK_START.md` - Quick reference guide
- `start-load-balanced.sh` - Startup script
- `test-load-balancer.sh` - Testing script
- `setup.sh` - Initial setup script

### Modified Files:

- `src/index.ts` - Added request tracking middleware

---

## 🎯 Verifying Everything Works

### ✓ Check Load Balancer is Running

```bash
curl http://localhost:8080/health
# Should return: {"status":"healthy"}
```

### ✓ Check All Instances are Healthy

```bash
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health
# Each should return status and uptime
```

### ✓ Test Request Distribution

```bash
./test-load-balancer.sh 30
# Should show roughly 33% requests per instance
```

### ✓ View Live Dashboard

Open in browser: `http://localhost:8080/lb-status`

---

## 🔧 Advanced Configuration

### Scale to More Instances

Add new instance to `docker-compose.yml` and update `nginx.conf`

### Change Load Balancing Algorithm

Edit `nginx.conf` upstream block:

- `round_robin` - Default, rotate through instances
- `least_conn` - **Current: fewest active connections**
- `ip_hash` - Same IP always goes to same instance
- `random` - Random distribution

### Monitor Performance

```bash
# Watch real-time stats
docker stats

# View detailed nginx logs
docker-compose logs -f nginx-lb

# Monitor specific instance
docker-compose logs -f apollo-server-1 --tail 100
```

---

## 🚨 Troubleshooting

### Load Balancer Not Responding

```bash
# Check if service is running
docker-compose ps nginx-lb

# View logs
docker-compose logs nginx-lb

# Verify port is accessible
netstat -tlnp | grep 8080
```

### Instance Health Issues

```bash
# Check specific instance health
curl http://localhost:4001/health

# View instance logs
docker-compose logs apollo-server-1

# Restart instance
docker-compose restart apollo-server-1
```

### Connection Pool Issues

```bash
# Check nginx upstream status
docker exec nginx-load-balancer nginx -T

# Verify instances are reachable from LB
docker exec nginx-load-balancer ping apollo-server-1
```

---

## 📊 Performance Metrics

When running `./test-load-balancer.sh`, you'll see:

```
Distribution Summary:
  apollo-server-1:4001: 10 requests (33%)
  apollo-server-2:4002: 10 requests (33%)
  apollo-server-3:4003: 10 requests (34%)
```

**This indicates**: ✅ Load balancer is working correctly

---

## 🛑 Stopping & Cleanup

```bash
# Stop all services (keeps data)
docker-compose down

# Stop and remove everything
docker-compose down -v

# View what will be removed
docker-compose down --dry-run
```

---

## 📚 Documentation Reference

- **Quick Start**: [QUICK_START.md](./QUICK_START.md) - Start here!
- **Detailed Setup**: [LOAD_BALANCER_SETUP.md](./LOAD_BALANCER_SETUP.md) - Complete guide
- **This File**: [SETUP_SUMMARY.md](./SETUP_SUMMARY.md) - Overview

---

## 🎓 What You Have Now

✅ Production-ready load balancing setup
✅ Automatic health checking and failover
✅ Request tracking and monitoring
✅ Shared database and cache
✅ Easy scaling to more instances
✅ Visual monitoring dashboard
✅ Load distribution testing

---

## 🚀 Next Steps

1. **Verify Setup Works**:

   ```bash
   ./start-load-balanced.sh
   curl http://localhost:8080/health
   ```

2. **Test Load Distribution**:

   ```bash
   ./test-load-balancer.sh 20
   ```

3. **View Dashboard**:
   - Open http://localhost:8080/lb-status in your browser

4. **Monitor Logs**:

   ```bash
   docker-compose logs -f
   ```

5. **Make GraphQL Queries**:
   - Use http://localhost:8080/graphql for queries
   - Observe which instance handled each request

---

**Setup Date**: January 20, 2025
**Environment**: Ubuntu 24.04.3 LTS with Docker
**Status**: ✅ Ready to Use
