# ✅ Setup Verification Checklist

## Pre-Startup Verification

- [ ] Docker is installed: `docker --version`
- [ ] Docker Compose is installed: `docker-compose --version`
- [ ] All ports are available:
  - [ ] Port 4001 (Instance 1)
  - [ ] Port 4002 (Instance 2)
  - [ ] Port 4003 (Instance 3)
  - [ ] Port 5438 (PostgreSQL)
  - [ ] Port 6379 (Redis)
  - [ ] Port 8080 (Load Balancer)
- [ ] Files exist:
  - [ ] `docker-compose.yml`
  - [ ] `nginx.conf`
  - [ ] `Dockerfile`
  - [ ] `src/index.ts` (with tracking middleware)

## Startup Checklist

### Option A: Using Startup Script

```bash
./start-load-balanced.sh
```

- [ ] Script runs without errors
- [ ] Shows service status at end

### Option B: Using docker-compose directly

```bash
docker-compose up --build
```

- [ ] Images build successfully
- [ ] Containers start without errors
- [ ] All 6 services show "Up" status

## Post-Startup Verification

### 1. Check Services are Running

```bash
docker-compose ps
```

Expected output:

```
NAME                    STATUS
apollo-redis            Up (healthy)
apollo-postgres         Up (healthy)
apollo-server-1         Up (healthy)
apollo-server-2         Up (healthy)
apollo-server-3         Up (healthy)
nginx-load-balancer     Up
```

- [ ] All services show "Up"
- [ ] Redis shows "(healthy)"
- [ ] PostgreSQL shows "(healthy)"
- [ ] All Apollo instances show "(healthy)"

### 2. Test Load Balancer Health

```bash
curl http://localhost:8080/health
```

Expected: `{"status":"healthy"}`

- [ ] Returns 200 status code
- [ ] Returns health status in response

### 3. Test Individual Instance Health

```bash
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health
```

Expected: JSON with instance info and uptime

- [ ] Instance 1 returns health check
- [ ] Instance 2 returns health check
- [ ] Instance 3 returns health check

### 4. Visit Load Balancer Dashboard

Open in browser: `http://localhost:8080/lb-status`

- [ ] Page loads successfully
- [ ] Shows all 3 instances as green/active
- [ ] Page refreshes every 5 seconds

### 5. Test GraphQL Endpoint

```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

- [ ] Returns successful GraphQL response (200 status)
- [ ] Response includes data field
- [ ] Response headers include `X-Instance-ID`

### 6. Check Request Tracking

```bash
docker-compose logs apollo-server-1 | tail -20
```

- [ ] Logs show request entries
- [ ] Logs include instance ID
- [ ] Logs show request duration
- [ ] Logs include response status codes

### 7. Verify Load Distribution

```bash
./test-load-balancer.sh 30
```

Expected output:

```
apollo-server-1:4001: 10 requests (33%)
apollo-server-2:4002: 10 requests (33%)
apollo-server-3:4003: 10 requests (34%)
```

- [ ] Test script completes successfully
- [ ] Shows request distribution
- [ ] Distribution is roughly balanced (25-40% each)
- [ ] Total requests matches NUM_REQUESTS parameter

### 8. Check Logs

```bash
docker-compose logs -f
```

- [ ] No ERROR messages
- [ ] No CRITICAL messages
- [ ] Nginx logs show requests being proxied
- [ ] Apollo logs show requests being processed

## Performance Verification

### 1. Database Connectivity

```bash
docker-compose logs postgres | grep "ready"
```

- [ ] Shows "database system is ready to accept connections"

### 2. Redis Connectivity

```bash
docker-compose logs redis | grep "ready"
```

- [ ] Shows Redis server is ready

### 3. Container Stats

```bash
docker stats --no-stream apollo-server-1 apollo-server-2 apollo-server-3
```

- [ ] All containers are running
- [ ] Memory usage is reasonable (< 500MB each)
- [ ] CPU usage is low when idle

## Advanced Testing

### 1. Test Instance Isolation

Make direct requests to each instance:

```bash
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health
```

- [ ] All three respond independently
- [ ] Each shows different instance ID

### 2. Test Failover (Optional)

```bash
# Stop one instance
docker-compose stop apollo-server-1

# Check load balancer still works
curl http://localhost:8080/health

# Send requests
./test-load-balancer.sh 20

# Should show only instances 2 and 3
```

- [ ] Load balancer continues working
- [ ] Requests route to remaining instances
- [ ] Dashboard shows instance 1 as unhealthy

```bash
# Restart the instance
docker-compose start apollo-server-1

# Check it recovers
./test-load-balancer.sh 20

# Should show all 3 instances again
```

- [ ] Instance recovers automatically
- [ ] Accepts requests again
- [ ] Load distribution is restored

### 3. Test Shared Database

1. Create data through Instance 1:

```bash
# Execute GraphQL mutation on port 4001
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createUser(...) }"}'
```

2. Read data through Instance 2:

```bash
# Query same data on port 4002
curl -X POST http://localhost:4002/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { users }"}'
```

- [ ] Data written by Instance 1 is visible in Instance 2
- [ ] Data is persisted in PostgreSQL
- [ ] All instances see the same data

### 4. Test Shared Cache

1. Cache something in Instance 1
2. Access from Instance 2

- [ ] Instance 2 gets cached data
- [ ] Redis contains the cached data

## Documentation Checklist

- [ ] Read [QUICK_START.md](./QUICK_START.md)
- [ ] Read [SETUP_SUMMARY.md](./SETUP_SUMMARY.md)
- [ ] Review [LOAD_BALANCER_SETUP.md](./LOAD_BALANCER_SETUP.md)
- [ ] Review [ARCHITECTURE.md](./ARCHITECTURE.md)

## Common Issues Resolution

### Issue: "Port already in use"

```bash
# Find what's using the port
lsof -i :8080

# Kill the process (if it's safe)
kill -9 <PID>

# Or change docker-compose ports
```

- [ ] Issue resolved

### Issue: "Cannot connect to Docker daemon"

```bash
# Check Docker is running
docker ps

# Start Docker if needed (depends on your system)
sudo systemctl start docker  # Linux
```

- [ ] Docker is running

### Issue: "Containers won't start"

```bash
# Check logs
docker-compose logs

# Try rebuilding
docker-compose down
docker-compose up --build
```

- [ ] Containers start successfully

### Issue: "Health checks failing"

```bash
# Check individual service logs
docker-compose logs postgres
docker-compose logs redis
docker-compose logs apollo-server-1

# Verify they have time to start (usually 10-30 seconds)
```

- [ ] All services are healthy

## Troubleshooting Logs

### View All Logs

```bash
docker-compose logs
```

### View Recent Logs (Last 100 lines)

```bash
docker-compose logs --tail 100
```

### Follow Logs in Real-time

```bash
docker-compose logs -f
```

### View Specific Service

```bash
docker-compose logs apollo-server-1
docker-compose logs nginx-lb
docker-compose logs postgres
```

### View Logs Since Specific Time

```bash
docker-compose logs --since 1m
```

- [ ] You can view logs for troubleshooting

## Final Checklist

- [ ] All 6 services running and healthy
- [ ] Load balancer dashboard accessible
- [ ] GraphQL endpoint working
- [ ] Requests tracked with instance IDs
- [ ] Load distribution is balanced
- [ ] No error messages in logs
- [ ] All 3 documentation files read
- [ ] Load balancer tested with script
- [ ] Response headers show correct instance ID

## Ready to Use! ✅

If all checkboxes are marked, your load-balanced Apollo Server setup is ready for:

- Development and testing
- Learning about load balancing
- Performance testing
- Request tracking and monitoring
- Multi-instance deployment simulation

---

## Support & Troubleshooting

If something doesn't work:

1. Check the logs: `docker-compose logs`
2. Review [LOAD_BALANCER_SETUP.md](./LOAD_BALANCER_SETUP.md) troubleshooting section
3. Verify all services are running: `docker-compose ps`
4. Test individual services directly by their ports
5. Check Docker and Docker Compose versions

---

**Verification Date**: January 20, 2025
**Status**: Ready for Testing