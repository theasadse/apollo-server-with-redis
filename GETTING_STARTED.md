# 🎯 Getting Started - Index

Welcome to your load-balanced Apollo Server setup! Here's where to go based on what you want to do:

## 🏃 Just Want to Run It?

### Option A: Using Scripts (Easiest)

```bash
./start-load-balanced.sh
```

Then open: http://localhost:8080/lb-status

### Option B: Using Docker Compose

```bash
docker-compose up --build
```

Then open: http://localhost:8080/lb-status

**Next**: Go to [Testing the Setup](#-testing-the-setup)

---

## 📚 I Want to Understand What This Is

Start with these docs in order:

1. **[README.md](./README.md)** - Overview and quick start
2. **[QUICK_START.md](./QUICK_START.md)** - Quick reference guide
3. **[SETUP_SUMMARY.md](./SETUP_SUMMARY.md)** - What's been configured
4. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System diagrams and design
5. **[LOAD_BALANCER_SETUP.md](./LOAD_BALANCER_SETUP.md)** - Detailed technical guide

---

## 🧪 Testing the Setup

### Verify Everything Works

```bash
# First, start the services
./start-load-balanced.sh

# Then in another terminal, test
./test-load-balancer.sh 30
```

Expected: Requests distributed roughly equally across 3 instances

### Manual Testing

```bash
# Test health
curl http://localhost:8080/health

# Test GraphQL
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

**Next**: Go to [Monitoring & Logs](#-monitoring--logs)

---

## 📊 Monitoring & Logs

### View All Services

```bash
docker-compose ps
```

### View Logs

```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f apollo-server-1
docker-compose logs -f nginx-lb
```

### View Dashboard

Open: http://localhost:8080/lb-status

---

## 🔍 How Load Balancing Works

1. **Request arrives** at nginx (port 8080)
2. **Nginx decides** which instance to send it to
3. **Algorithm**: Least Connections (instance with fewest active connections)
4. **Instance processes** the request
5. **Response includes** X-Instance-ID header showing which instance handled it

---

## 📈 Key Access Points

| What                     | URL                             |
| ------------------------ | ------------------------------- |
| **Load Balancer Status** | http://localhost:8080/lb-status |
| **GraphQL Endpoint**     | http://localhost:8080/graphql   |
| **Instance 1**           | http://localhost:4001/graphql   |
| **Instance 2**           | http://localhost:4002/graphql   |
| **Instance 3**           | http://localhost:4003/graphql   |

---

## 🛑 Stopping Services

```bash
# Stop without deleting data
docker-compose down

# Stop and delete everything
docker-compose down -v
```

---

## 🚨 Something Not Working?

1. **Check service status**

   ```bash
   docker-compose ps
   ```

2. **Check logs**

   ```bash
   docker-compose logs
   ```

3. **See troubleshooting guide**
   - [LOAD_BALANCER_SETUP.md - Troubleshooting](./LOAD_BALANCER_SETUP.md#troubleshooting)
   - [VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md)

---

## 📖 Documentation Files

| File                          | Purpose                 |
| ----------------------------- | ----------------------- |
| **README.md**                 | Main project overview   |
| **QUICK_START.md**            | Quick reference guide   |
| **SETUP_SUMMARY.md**          | Setup overview          |
| **LOAD_BALANCER_SETUP.md**    | Detailed technical docs |
| **ARCHITECTURE.md**           | Diagrams and design     |
| **VERIFICATION_CHECKLIST.md** | Testing checklist       |
| **GETTING_STARTED.md**        | This file!              |

---

## 🎯 Common Tasks

### Run Load Balancer

```bash
./start-load-balanced.sh
```

### Test Load Distribution

```bash
./test-load-balancer.sh 20
```

### Monitor Logs

```bash
docker-compose logs -f
```

### Stop All Services

```bash
docker-compose down
```

### Restart Services

```bash
docker-compose restart
```

### Check Service Status

```bash
docker-compose ps
```

### View Resource Usage

```bash
docker stats
```

---

## 🚀 Your Setup Includes

✅ 3 Apollo Server instances running in parallel
✅ Nginx load balancer distributing traffic
✅ Shared PostgreSQL database
✅ Shared Redis cache
✅ Automatic health checking
✅ Request tracking with instance IDs
✅ Visual dashboard for monitoring
✅ Test scripts for verification

---

## 📝 Next Steps

1. ✅ **Start Services**: `./start-load-balanced.sh`
2. ✅ **Check Dashboard**: http://localhost:8080/lb-status
3. ✅ **Test Load Distribution**: `./test-load-balancer.sh 30`
4. ✅ **Monitor Logs**: `docker-compose logs -f`
5. ✅ **Read Docs**: Start with [README.md](./README.md)

---

## 🎓 What You're Learning

This setup teaches you:

- How load balancers distribute traffic
- Multi-instance application architecture
- Health checking and failover mechanisms
- Request tracking and logging
- Docker containerization
- Nginx configuration
- Monitoring and logging

---

## 📞 Quick Commands Reference

```bash
# Setup & Start
./setup.sh                          # Initial setup
./start-load-balanced.sh            # Start services
docker-compose up --build           # Alternative start

# Testing
./test-load-balancer.sh 30         # Test load distribution
curl http://localhost:8080/health  # Check health

# Monitoring
docker-compose logs -f              # View logs
docker-compose ps                   # Check status
docker stats                        # View resource usage

# Stopping
docker-compose down                 # Stop services
docker-compose down -v              # Stop & delete data

# Troubleshooting
docker-compose logs apollo-server-1 # View instance logs
docker-compose logs nginx-lb        # View LB logs
curl http://localhost:4001/health  # Check instance health
```

---

**Welcome! 🎉 You're all set. Start with `./start-load-balanced.sh` and open http://localhost:8080/lb-status**

---

**Created**: January 20, 2025
