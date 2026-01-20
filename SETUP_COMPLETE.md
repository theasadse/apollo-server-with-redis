╔════════════════════════════════════════════════════════════════════════════╗
║ ║
║ ✅ LOAD-BALANCED APOLLO SERVER SETUP - COMPLETE ║
║ ║
║ Your multi-instance load balancer is ready! ║
║ ║
╚════════════════════════════════════════════════════════════════════════════╝

## 📦 What Was Created

Your project now has a complete load-balanced setup with:

### 🔧 Configuration Files

✅ docker-compose.yml - 3 Apollo instances + Load Balancer + DB + Cache
✅ nginx.conf - Nginx load balancer configuration
✅ Dockerfile - Production-grade container image

### 📊 Scripts

✅ setup.sh - Initial setup script
✅ start-load-balanced.sh - Start all services with one command
✅ test-load-balancer.sh - Test load distribution across instances

### 📚 Documentation (Pick One to Start)

✅ GETTING_STARTED.md - 👈 START HERE! Quick index
✅ README.md - Complete project overview
✅ QUICK_START.md - Quick reference guide
✅ SETUP_SUMMARY.md - What's been configured
✅ LOAD_BALANCER_SETUP.md - Detailed technical documentation
✅ ARCHITECTURE.md - System diagrams and design
✅ VERIFICATION_CHECKLIST.md - Step-by-step testing guide

### 💻 Modified Files

✅ src/index.ts - Added request tracking middleware

---

## 🚀 QUICK START (3 Commands)

### 1. Start Services

```bash
./start-load-balanced.sh
```

### 2. Check Dashboard

Open in browser: http://localhost:8080/lb-status

### 3. Test Load Distribution

```bash
./test-load-balancer.sh 20
```

---

## 📊 YOUR SETUP INCLUDES

### Instances

┌─────────────────────────────────────────────────────────────┐
│ • Apollo Server Instance 1 (Port 4001) │
│ • Apollo Server Instance 2 (Port 4002) │
│ • Apollo Server Instance 3 (Port 4003) │
└─────────────────────────────────────────────────────────────┘

### Load Balancer

┌─────────────────────────────────────────────────────────────┐
│ • Nginx Load Balancer (Port 8080) │
│ • Algorithm: Least Connections │
│ • Health Checking: Every 5-10 seconds │
│ • Automatic Failover: Enabled │
│ • Dashboard: /lb-status │
└─────────────────────────────────────────────────────────────┘

### Infrastructure

┌─────────────────────────────────────────────────────────────┐
│ • PostgreSQL Database (Port 5438) - Shared │
│ • Redis Cache (Port 6379) - Shared │
│ • All instances use same database and cache │
└─────────────────────────────────────────────────────────────┘

### Features

┌─────────────────────────────────────────────────────────────┐
│ • Request Tracking (Instance ID in headers) │
│ • Request Logging (Console + logs) │
│ • Health Monitoring (Automatic checks) │
│ • Performance Tracking (Duration per request) │
│ • Load Distribution (Balanced across instances) │
│ • Visual Dashboard (Status page) │
└─────────────────────────────────────────────────────────────┘

---

## 🎯 KEY ACCESS POINTS

┌────────────────────────────────────────────────────────────┐
│ Load Balancer Dashboard │
│ http://localhost:8080/lb-status │
│ → See all instances and their health status │
├────────────────────────────────────────────────────────────┤
│ GraphQL Endpoint (via Load Balancer) │
│ http://localhost:8080/graphql │
│ → Use this for all GraphQL queries/mutations │
├────────────────────────────────────────────────────────────┤
│ Health Check │
│ http://localhost:8080/health │
│ → Verify load balancer is working │
├────────────────────────────────────────────────────────────┤
│ Direct Instance Access (for testing) │
│ http://localhost:4001/graphql (Instance 1) │
│ http://localhost:4002/graphql (Instance 2) │
│ http://localhost:4003/graphql (Instance 3) │
│ → Bypass load balancer, test individual instances │
└────────────────────────────────────────────────────────────┘

---

## 🧪 TESTING THE SETUP

### Automatic Test (Recommended)

```bash
./test-load-balancer.sh 30
```

Expected output:

```
apollo-server-1:4001: 10 requests (33%)
apollo-server-2:4002: 10 requests (33%)
apollo-server-3:4003: 10 requests (34%)
```

### Manual Test

```bash
# Test health
curl http://localhost:8080/health

# Test GraphQL
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

### Monitor Logs

```bash
docker-compose logs -f
```

---

## 🔍 REQUEST TRACKING EXAMPLE

When you make a request, you'll see:

### Response Headers

```
X-Instance-ID: apollo-server-1:4001
X-Request-ID: instance-1-1705761045123-x7k9p2m
```

### Console Logs

```
[2025-01-20T08:30:45.123Z] [instance-1] POST /graphql - Request ID: instance-1-1705761045123-x7k9p2m
[2025-01-20T08:30:45.456Z] [instance-1] POST /graphql - Status: 200 - Duration: 334ms
```

This shows:
✓ Which instance handled the request
✓ When it was received
✓ How long it took to process
✓ What the response status was

---

## 📈 LOAD BALANCING ALGORITHM

Least Connections:

- Tracks active connections to each instance
- Routes new requests to instance with fewest connections
- Results in fair and balanced distribution
- Improves response times
- Prevents overloading any single instance

Example:

```
Instance 1: 2 active connections ← Gets next request
Instance 2: 3 active connections
Instance 3: 4 active connections
```

---

## 🛠️ COMMON COMMANDS

### Start Services

```bash
./start-load-balanced.sh
# or
docker-compose up --build
```

### Test Load Distribution

```bash
./test-load-balancer.sh 20
./test-load-balancer.sh 50
./test-load-balancer.sh 100
```

### View Logs

```bash
docker-compose logs -f                    # All logs
docker-compose logs -f apollo-server-1    # Instance 1 logs
docker-compose logs -f nginx-lb           # Load balancer logs
```

### Check Status

```bash
docker-compose ps                         # Service status
docker stats                              # Resource usage
curl http://localhost:8080/health         # Health check
```

### Stop Services

```bash
docker-compose down                       # Stop (keep data)
docker-compose down -v                    # Stop & delete data
```

### Restart Services

```bash
docker-compose restart                    # Restart all
docker-compose restart apollo-server-1    # Restart one instance
```

---

## 📚 DOCUMENTATION GUIDE

### Where to Start

```
1. GETTING_STARTED.md    ← Quick index (you are here!)
2. README.md             ← Project overview
3. QUICK_START.md        ← Quick reference
```

### For Deep Understanding

```
4. SETUP_SUMMARY.md          ← What's configured
5. ARCHITECTURE.md           ← System diagrams
6. LOAD_BALANCER_SETUP.md    ← Detailed technical docs
```

### For Verification

```
7. VERIFICATION_CHECKLIST.md ← Test everything
```

---

## 🚨 TROUBLESHOOTING

### Services Won't Start

```bash
docker-compose logs
docker-compose down -v
docker-compose up --build
```

### Check Service Status

```bash
docker-compose ps
```

### View Specific Logs

```bash
docker-compose logs nginx-lb      # Load balancer
docker-compose logs apollo-server-1 # Instance
docker-compose logs postgres      # Database
docker-compose logs redis         # Cache
```

### Test Directly

```bash
curl http://localhost:4001/health # Instance 1
curl http://localhost:4002/health # Instance 2
curl http://localhost:4003/health # Instance 3
```

For more help: See [LOAD_BALANCER_SETUP.md](./LOAD_BALANCER_SETUP.md#troubleshooting)

---

## ✅ VERIFICATION CHECKLIST

After starting services, verify:

- [ ] All 6 services running: `docker-compose ps`
- [ ] Load balancer responding: `curl http://localhost:8080/health`
- [ ] Dashboard accessible: http://localhost:8080/lb-status
- [ ] All instances healthy in dashboard
- [ ] GraphQL working: `curl -X POST http://localhost:8080/graphql ...`
- [ ] Load test shows balanced distribution: `./test-load-balancer.sh 30`
- [ ] Response headers include X-Instance-ID
- [ ] Console logs show request tracking

See [VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md) for detailed steps.

---

## 🎓 WHAT YOU HAVE

✅ **Production-Grade Setup**

- Multiple instances running independently
- Automatic load distribution
- Health checking and failover
- Comprehensive logging

✅ **Learning Resource**

- See how load balancers work
- Request tracking demonstration
- Multi-instance architecture example
- Docker containerization

✅ **Scalable Design**

- Easy to add more instances
- Shared database for data consistency
- Redis for distributed caching
- Can handle thousands of requests

---

## 🔄 ARCHITECTURE OVERVIEW

```
                    Client
                      │
                      ▼
        ┌─────────────────────────┐
        │  Nginx Load Balancer    │
        │  (Port 8080)            │
        └────┬────────┬───────┬──┘
             │        │       │
       ┌─────▼─┐ ┌───▼──┐ ┌──▼────┐
       │Apollo │ │Apollo│ │Apollo  │
       │Srv 1  │ │Srv 2 │ │Srv 3   │
       │:4001  │ │:4002 │ │:4003   │
       └───┬───┘ └──┬───┘ └───┬───┘
           │       │         │
           └───────┼─────────┘
                   │
         ┌─────────▼──────────┐
         │ PostgreSQL + Redis │
         │  (Shared)          │
         └────────────────────┘
```

---

## 🚀 NEXT STEPS

1. **Start Services**

   ```bash
   ./start-load-balanced.sh
   ```

2. **Open Dashboard**
   - http://localhost:8080/lb-status

3. **Test Load Distribution**

   ```bash
   ./test-load-balancer.sh 30
   ```

4. **Monitor Logs**

   ```bash
   docker-compose logs -f
   ```

5. **Read Documentation**
   - Start with README.md or QUICK_START.md

6. **Explore Features**
   - Make GraphQL queries
   - Watch request tracking in logs
   - View response headers
   - Check load balancer dashboard

---

## 🎉 YOU'RE ALL SET!

Your load-balanced Apollo Server setup is complete and ready to use.

### Quick Start (Choose One)

**Option A: Using Startup Script**

```bash
./start-load-balanced.sh
```

**Option B: Using Docker Compose**

```bash
docker-compose up --build
```

Then:

- Open http://localhost:8080/lb-status
- Run `./test-load-balancer.sh 30`
- View logs: `docker-compose logs -f`

---

## 📖 Documentation Files Available

```
GETTING_STARTED.md ..................... This file (Quick index)
README.md ............................. Project overview
QUICK_START.md ........................ Quick reference guide
SETUP_SUMMARY.md ..................... Setup overview
LOAD_BALANCER_SETUP.md ............... Detailed documentation
ARCHITECTURE.md ....................... System diagrams
VERIFICATION_CHECKLIST.md ............. Testing checklist
```

**Start with any of these:**

- First time? → README.md
- Want to start fast? → QUICK_START.md
- Need step-by-step? → VERIFICATION_CHECKLIST.md
- Want technical details? → LOAD_BALANCER_SETUP.md

---

**Setup Date**: January 20, 2025
**Environment**: Ubuntu 24.04.3 LTS with Docker
**Status**: ✅ Complete & Ready to Use

---

## 🎯 ONE COMMAND START

```bash
./start-load-balanced.sh && echo "Open http://localhost:8080/lb-status in your browser"
```

That's it! Your load-balanced Apollo Server is running. 🚀
