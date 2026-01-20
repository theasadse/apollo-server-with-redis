# Load Balanced Apollo Server with Redis

## Local Multi-Instance Setup with Docker

This project demonstrates a load-balanced Apollo Server setup with multiple instances running locally using Docker.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX Load Balancer (Port 8080)               │
│                  Least Connections Algorithm                     │
└────────────────┬────────────────┬────────────────────────────────┘
                 │                │
    ┌────────────▼──┐  ┌──────────▼────┐  ┌──────────────┐
    │ Apollo Server │  │ Apollo Server  │  │ Apollo Server│
    │  Instance 1   │  │  Instance 2    │  │  Instance 3  │
    │  (Port 4001)  │  │  (Port 4002)   │  │  (Port 4003) │
    └────────────┬──┘  └──────────┬────┘  └───────┬──────┘
                 │                │               │
    ┌────────────▼────────────────▼───────────────▼──────┐
    │         Shared PostgreSQL Database                  │
    │            (Port 5438)                              │
    └──────────────────────────────────────────────────────┘
                        │
    ┌───────────────────▼──────────────────┐
    │      Shared Redis Cache               │
    │        (Port 6379)                    │
    └──────────────────────────────────────┘
```

### Features

- ✅ **Multiple Instances**: 3 Apollo Server instances running independently
- ✅ **Load Balancing**: Nginx with least connections algorithm
- ✅ **Request Tracking**: Each request logged with instance ID and duration
- ✅ **Shared Database**: PostgreSQL with Drizzle ORM
- ✅ **Shared Cache**: Redis for caching across instances
- ✅ **Health Checks**: Automatic instance health monitoring
- ✅ **Load Balancer Dashboard**: Visual status page at `http://localhost:8080/lb-status`
- ✅ **Request Logging**: Detailed console logs showing which instance handled each request

### Quick Start

#### 1. Start All Services

```bash
docker-compose up --build
```

This will start:

- 3 Apollo Server instances (ports 4001, 4002, 4003)
- Nginx Load Balancer (port 8080)
- PostgreSQL database
- Redis cache

#### 2. Access the Services

**Load Balancer Dashboard:**

```
http://localhost:8080/lb-status
```

**GraphQL through Load Balancer:**

```
http://localhost:8080/graphql
```

**Direct Instance Access (for testing):**

- Instance 1: `http://localhost:4001/graphql`
- Instance 2: `http://localhost:4002/graphql`
- Instance 3: `http://localhost:4003/graphql`

**Health Check:**

```bash
curl http://localhost:8080/health
```

### Request Tracking

All requests are tracked with the following information:

- **Instance ID**: Which server instance handled the request
- **Request ID**: Unique identifier for each request
- **Duration**: Response time in milliseconds
- **Status Code**: HTTP response status

Example console output:

```
[2025-01-20T12:34:56.789Z] [instance-1] GET /graphql - Request ID: instance-1-1705759496789-abc123xyz
[2025-01-20T12:34:57.123Z] [instance-1] GET /graphql - Status: 200 - Duration: 334ms
```

### Load Balancing Details

**Algorithm**: Least Connections

- Nginx forwards requests to the instance with the fewest active connections
- Ensures even distribution of load across all instances

**Health Check Configuration**:

- Check interval: Every 5-10 seconds
- Timeout: 3-5 seconds
- Max failures: 3 consecutive failures marks instance as unhealthy
- Recovery: Marked unhealthy instances are automatically removed from rotation

### Testing Load Balancing

#### Option 1: Using curl

```bash
# Single request
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'

# Multiple requests to see different instances
for i in {1..10}; do
  curl -X POST http://localhost:8080/graphql \
    -H "Content-Type: application/json" \
    -d '{"query": "{ __typename }"}' -s | jq .
done
```

#### Option 2: Using GraphQL Playground

1. Open `http://localhost:8080/graphql` in your browser
2. Execute queries
3. Check the response headers for `X-Instance-ID` to see which instance handled the request
4. Look at server logs to see request tracking

#### Option 3: Monitor Logs

```bash
# Watch logs for all services
docker-compose logs -f

# Watch specific instance logs
docker-compose logs -f apollo-server-1
docker-compose logs -f apollo-server-2
docker-compose logs -f apollo-server-3

# Watch nginx logs
docker-compose logs -f nginx-lb
```

### Environment Variables

The following environment variables are set for each instance:

```
PORT: 4001/4002/4003 (different for each instance)
INSTANCE_ID: instance-1/instance-2/instance-3
REDIS_URL: redis://redis:6379
DATABASE_URL: postgresql://postgres:postgres@postgres:5432/apollo_db
NODE_ENV: development
```

### Scaling

To add more instances:

1. **Add new service in docker-compose.yml**:

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
  # ... rest of config
```

2. **Update nginx.conf upstream block**:

```nginx
upstream apollo_backend {
    least_conn;
    server apollo-server-1:4001;
    server apollo-server-2:4002;
    server apollo-server-3:4003;
    server apollo-server-4:4004;  # Add this line
}
```

3. **Restart services**:

```bash
docker-compose down
docker-compose up --build
```

### Performance Monitoring

#### Check Instance Health

```bash
curl http://localhost:8080/health
```

#### Monitor Active Connections

```bash
# View docker container stats
docker stats apollo-server-1 apollo-server-2 apollo-server-3
```

#### View Load Balancer Status

```bash
# The dashboard at http://localhost:8080/lb-status provides visual feedback
# Refresh it to see the latest status (auto-refreshes every 5 seconds)
```

### Troubleshooting

**Instance not responding?**

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs apollo-server-1

# Check health
curl http://localhost:4001/health
```

**Load Balancer showing unhealthy instances?**

```bash
# Check nginx logs
docker-compose logs nginx-lb

# Verify upstream connectivity
docker exec nginx-load-balancer ping apollo-server-1
```

**PostgreSQL connection issues?**

```bash
# Check postgres logs
docker-compose logs postgres

# Verify connection
docker exec apollo-postgres psql -U postgres -c "SELECT 1"
```

**Redis connection issues?**

```bash
# Check redis logs
docker-compose logs redis

# Test redis
docker exec apollo-redis redis-cli ping
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Remove volumes (careful - this deletes data!)
docker-compose down -v

# Rebuild and start
docker-compose up --build
```

### Response Headers

When making requests through the load balancer, you'll receive these headers:

```
X-Instance-ID: apollo-server-1:4001    # Which instance handled the request
X-Request-ID: instance-1-1705759496789  # Unique request identifier
```

### Database & Cache

Both PostgreSQL and Redis are shared across all instances:

- All instances use the same database
- Data written by instance-1 is immediately available to instance-2 and instance-3
- Redis provides distributed caching across all instances

### Next Steps

1. Run database migrations: `docker exec apollo-postgres npm run db:push`
2. Seed initial data: `docker exec apollo-server-1 npm run db:seed`
3. Execute GraphQL queries through `http://localhost:8080/graphql`
4. Monitor which instances handle your requests in the console

---

**Environment**: Ubuntu 24.04.3 LTS with Docker
**Created**: January 20, 2025
