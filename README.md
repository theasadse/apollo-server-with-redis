# Apollo Server with Redis - Load Balanced Multi-Instance Setup

## 🚀 Quick Start (3 Commands)

```bash
# 1. Run setup (first time only)
./setup.sh

# 2. Start all services
./start-load-balanced.sh

# 3. Test load balancing
./test-load-balancer.sh 20
```

Then open:

- **Dashboard**: http://localhost:8080/lb-status
- **GraphQL**: http://localhost:8080/graphql

---

## 📊 What This Project Provides

A **production-grade load-balanced Apollo Server setup** with:

✅ **3 Independent Server Instances** (ports 4001, 4002, 4003)
✅ **Nginx Load Balancer** (port 8080) with least-connections algorithm
✅ **Automatic Request Tracking** - see which instance handled each request
✅ **Visual Dashboard** - monitor instance health and status
✅ **Shared PostgreSQL Database** - all instances use the same data
✅ **Shared Redis Cache** - distributed caching across instances
✅ **Health Checks & Failover** - automatic detection and recovery
✅ **Request Distribution Testing** - verify balanced load distribution

---

## 🏗️ Architecture

```
                    Client/Browser
                            │
                ┌───────────▼─────────────┐
                │  Nginx Load Balancer    │
                │  (Port 8080)            │
                │  Least Connections LB   │
                └─┬──────────┬─────────┬──┘
                  │          │         │
            ┌─────▼─┐  ┌────▼──┐  ┌──▼────┐
            │Apollo │  │Apollo │  │Apollo  │
            │Srv 1  │  │Srv 2  │  │Srv 3   │
            │:4001  │  │:4002  │  │:4003   │
            └────┬──┘  └───┬───┘  └───┬───┘
                 │         │          │
            ┌────▼─────────▼──────────▼──┐
            │  Shared PostgreSQL + Redis │
            └──────────────────────────────┘
```

---

## 📖 Documentation

| Document                                                 | Purpose                               |
| -------------------------------------------------------- | ------------------------------------- |
| [QUICK_START.md](./QUICK_START.md)                       | **Start here!** Quick reference guide |
| [SETUP_SUMMARY.md](./SETUP_SUMMARY.md)                   | Overview of what's been configured    |
| [LOAD_BALANCER_SETUP.md](./LOAD_BALANCER_SETUP.md)       | Detailed technical documentation      |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                     | System diagrams and architecture      |
| [VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md) | Checklist to verify everything works  |

**→ Read [QUICK_START.md](./QUICK_START.md) first!**

---

## 🎯 Key Features

### 1. Load Balancing

- **Algorithm**: Least Connections - routes to instance with fewest active connections
- **Health Checking**: Every 5-10 seconds with automatic failover
- **Sticky Sessions**: Optional IP-based routing (configurable in nginx.conf)

### 2. Request Tracking

Every request includes:

```
X-Instance-ID: apollo-server-1:4001
X-Request-ID: instance-1-1705761045123-x7k9p2m
```

Console logs show:

```
[2025-01-20T08:30:45.123Z] [instance-1] POST /graphql - Request ID: instance-1-1705761045123-x7k9p2m
[2025-01-20T08:30:45.456Z] [instance-1] POST /graphql - Status: 200 - Duration: 333ms
```

### 3. Shared Infrastructure

- **PostgreSQL Database**: All instances share one database
- **Redis Cache**: Distributed cache across all instances
- **Data Consistency**: ACID transactions, no replication needed

### 4. Monitoring Dashboard

Access at: http://localhost:8080/lb-status

Shows:

- All instance statuses (active/inactive)
- Load balancing algorithm in use
- Real-time status page with 5-second auto-refresh

---

## 🚀 Getting Started

### Prerequisites

- Docker: `docker --version`
- Docker Compose: `docker-compose --version`
- Available ports: 4001, 4002, 4003, 5438, 6379, 8080

### Step 1: Initial Setup

```bash
./setup.sh
```

Creates `.env` file and makes scripts executable.

### Step 2: Start Services

```bash
./start-load-balanced.sh
```

Or directly with docker-compose:

```bash
docker-compose up --build
```

### Step 3: Verify Setup

```bash
# Check load balancer health
curl http://localhost:8080/health

# Test with GraphQL
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

### Step 4: Test Load Distribution

```bash
./test-load-balancer.sh 30
```

Expected output:

```
Distribution Summary:
  apollo-server-1:4001: 10 requests (33%)
  apollo-server-2:4002: 10 requests (33%)
  apollo-server-3:4003: 10 requests (34%)
```

---

## 📊 Access Points

| URL                               | Purpose                   |
| --------------------------------- | ------------------------- |
| `http://localhost:8080/lb-status` | Load Balancer Dashboard   |
| `http://localhost:8080/graphql`   | GraphQL Endpoint (via LB) |
| `http://localhost:8080/health`    | Health Check              |
| `http://localhost:4001/graphql`   | Direct to Instance 1      |
| `http://localhost:4002/graphql`   | Direct to Instance 2      |
| `http://localhost:4003/graphql`   | Direct to Instance 3      |

---

## 🧪 Testing

### Test Load Distribution (Recommended)

```bash
# Quick test
./test-load-balancer.sh 10

# Standard test
./test-load-balancer.sh 30

# Stress test
./test-load-balancer.sh 100
```

### Manual Testing

```bash
# Single request
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'

# Multiple requests in a loop
for i in {1..10}; do
  curl -X POST http://localhost:8080/graphql \
    -H "Content-Type: application/json" \
    -d '{"query": "{ __typename }"}' -s
  echo ""
done
```

### Monitor Logs

```bash
# All services
docker-compose logs -f

# Specific instance
docker-compose logs -f apollo-server-1

# Load balancer
docker-compose logs -f nginx-lb

# Database
docker-compose logs -f postgres
```

---

## 🔧 Configuration Files

### docker-compose.yml

Defines all services:

- 3 Apollo Server instances
- Nginx load balancer
- PostgreSQL database
- Redis cache

### nginx.conf

Load balancer configuration:

- Upstream servers and health checks
- Request routing rules
- SSL/TLS settings (optional)
- Custom headers (X-Instance-ID, X-Request-ID)

### Dockerfile

Multi-stage build for production-ready images:

- Build dependencies
- Optimized runtime

### src/index.ts

Apollo Server with:

- Request tracking middleware
- Instance ID management
- Health check endpoint

---

## 📈 Monitoring

### View Service Status

```bash
docker-compose ps
```

### View Resource Usage

```bash
docker stats apollo-server-1 apollo-server-2 apollo-server-3
```

### Check Logs for Errors

```bash
docker-compose logs | grep -i error
```

### Monitor Specific Service

```bash
docker-compose logs -f apollo-server-1 --tail 50
```

---

## 🛑 Stopping & Cleanup

### Stop All Services (Keep Data)

```bash
docker-compose down
```

### Stop Everything & Remove Data

```bash
docker-compose down -v
```

### Restart Services

```bash
docker-compose restart
```

### Remove Containers & Networks (Keep Volumes)

```bash
docker-compose down --remove-orphans
```

---

## 🔄 Scaling to More Instances

To add a 4th instance:

1. **Update docker-compose.yml** - Add new service (apollo-server-4 on port 4004)
2. **Update nginx.conf** - Add server to upstream block
3. **Restart** - `docker-compose up --build`

See [LOAD_BALANCER_SETUP.md](./LOAD_BALANCER_SETUP.md) for detailed instructions.

---

## 🚨 Troubleshooting

### Services won't start

```bash
docker-compose logs
docker-compose down -v
docker-compose up --build
```

### Load balancer not responding

```bash
curl http://localhost:8080/health
docker-compose logs nginx-lb
```

### Instance health issues

```bash
curl http://localhost:4001/health
docker-compose logs apollo-server-1
docker-compose restart apollo-server-1
```

### Database connection issues

```bash
docker-compose logs postgres
docker exec apollo-postgres psql -U postgres -c "SELECT 1"
```

### Redis connection issues

```bash
docker-compose logs redis
docker exec apollo-redis redis-cli ping
```

See [LOAD_BALANCER_SETUP.md](./LOAD_BALANCER_SETUP.md) for more troubleshooting.

---

## 📚 Technologies Used

- **Apollo Server**: GraphQL server
- **Express**: HTTP framework
- **Nginx**: Load balancer
- **PostgreSQL**: Primary database
- **Redis**: Caching layer
- **Drizzle ORM**: Database ORM
- **Docker**: Containerization
- **TypeScript**: Type-safe code

---

## 📊 Project Structure

```
.
├── docker-compose.yml              # Multi-instance configuration
├── nginx.conf                      # Load balancer config
├── Dockerfile                      # Container image
├── src/
│   ├── index.ts                   # Apollo Server with tracking
│   ├── schema.ts                  # GraphQL schema
│   ├── resolvers/                 # GraphQL resolvers
│   ├── utils/
│   │   └── redis.ts              # Redis utilities
│   └── db/                        # Database config
├── QUICK_START.md                 # Quick reference
├── SETUP_SUMMARY.md               # Setup overview
├── LOAD_BALANCER_SETUP.md         # Detailed docs
├── ARCHITECTURE.md                # System diagrams
├── VERIFICATION_CHECKLIST.md      # Testing checklist
├── start-load-balanced.sh         # Startup script
├── test-load-balancer.sh          # Testing script
├── setup.sh                       # Initial setup
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
└── README.md                      # This file
```

---

## 🎓 Learning Resources

This project demonstrates:

- ✅ Load balancing concepts
- ✅ Multi-instance architecture
- ✅ Request tracking & logging
- ✅ Health checking & failover
- ✅ Docker containerization
- ✅ Shared database patterns
- ✅ Distributed caching

---

## 📝 Environment Variables

Set in docker-compose.yml or .env:

```
NODE_ENV=development
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=apollo_db
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/apollo_db
REDIS_URL=redis://redis:6379
PORT=4000 (overridden per instance)
INSTANCE_ID=default (set per instance)
```

---

## 🤝 Contributing

Feel free to customize:

- Add more instances
- Change load balancing algorithm
- Add additional endpoints
- Enhance monitoring
- Add authentication
- Implement caching strategies

---

## 📄 License

ISC

---

## ✨ Features Summary

| Feature          | Status | Details                        |
| ---------------- | ------ | ------------------------------ |
| Load Balancing   | ✅     | Least connections algorithm    |
| Request Tracking | ✅     | Instance ID in headers & logs  |
| Health Checks    | ✅     | Every 5-10 seconds             |
| Failover         | ✅     | Automatic removal & recovery   |
| Dashboard        | ✅     | Visual status page             |
| Shared Database  | ✅     | PostgreSQL with Drizzle        |
| Shared Cache     | ✅     | Redis for all instances        |
| Docker Ready     | ✅     | Production-grade images        |
| Monitoring       | ✅     | Comprehensive logging          |
| Testing Scripts  | ✅     | Load distribution verification |

---

## 🚀 Next Steps

1. **Read [QUICK_START.md](./QUICK_START.md)** - Understand the setup
2. **Run `./start-load-balanced.sh`** - Start services
3. **Open http://localhost:8080/lb-status** - View dashboard
4. **Run `./test-load-balancer.sh 30`** - Test load distribution
5. **Monitor logs** - `docker-compose logs -f`
6. **Review [ARCHITECTURE.md](./ARCHITECTURE.md)** - Understand the design

---

**Created**: January 20, 2025
**Environment**: Ubuntu 24.04.3 LTS with Docker
**Status**: ✅ Production Ready
