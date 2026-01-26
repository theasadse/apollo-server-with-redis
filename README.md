# Apollo Server with Redis - Kubernetes Load Balanced Setup

## 🚀 Quick Start with Kubernetes (3 Steps)

```bash
# 1. Start Infrastructure (Postgres + Redis)
docker-compose up -d

# 2. Build and Deploy
docker build -t apollo-server-with-redis-apollo-server:latest .
kubectl apply -f k8s/

# 3. Access the Project
# GraphQL: http://localhost:30080/graphql
# Dashboard: http://localhost:30080/lb-status
```

---

## 📊 project Overview

This project has been migrated to a **Kubernetes-native setup** with full autoscaling and load balancing.

✅ **Horizontal Pod Autoscaling (HPA)** - Scales from 2 to 50 pods based on CPU/Memory
✅ **Nginx Load Balancer** - In-cluster routing with NodePort 30080
✅ **Distributed Redis Caching** - All pods share a single Redis cache
✅ **Postgres Infrastructure** - Persistent storage via Shared DB
✅ **Real-time Monitoring** - Track request distribution across pods
✅ **Load Testing** - Built-in script to test 1 million requests and monitor scaling

---

## 🏗️ Kubernetes Architecture

```
                    Client/Browser
                            │
                ┌───────────▼─────────────┐
                │    Nginx Service        │
                │    (NodePort :30080)    │
                └───────────┬─────────────┘
                            │
                ┌───────────▼─────────────┐
                │    Apollo Service       │
                │    (ClusterIP :4000)    │
                └───────────┬─────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
      ┌──────────┐    ┌──────────┐    ┌──────────┐
      │ Apollo   │    │ Apollo   │    │ Apollo   │
      │ Pod (1)  │    │ Pod (2)  │    │ Pod (n)  │
      └─────┬────┘    └─────┬────┘    └─────┬────┘
            │               │               │
            └───────────────┴───────────────┘
                            │
            ┌───────────────▼───────────────┐
            │   Shared PostgreSQL + Redis   │
            │   (Running in Docker)         │
            └───────────────────────────────┘
```

---

## 📖 New Documentation (Focus on Kubernetes)

| Document                                                 | Purpose                               |
| -------------------------------------------------------- | ------------------------------------- |
| [FRESH_INSTALL_GUIDE.md](./FRESH_INSTALL_GUIDE.md)       | **Start here!** Build & Run from scratch |
| [K8S_LOAD_TEST_GUIDE.md](./K8S_LOAD_TEST_GUIDE.md)       | How to run 1M requests & monitor HPA  |
| [k8s-load-test-1m.sh](./k8s-load-test-1m.sh)             | Automated script for load testing     |
| [SETUP-GUIDE.md](./SETUP-GUIDE.md)                       | Deep dive into architecture & K8s files |

---

## 🧪 Testing the Scaling

The best way to see the power of this setup is to run a massive load test:

```bash
# Run 1 million requests and watch pods scale!
./k8s-load-test-1m.sh
```

**Monitor in Real-time:**
- Pod Scaling: `kubectl get pods -l app=apollo --watch`
- Resource Usage: `kubectl top pods`
- HPA Status: `kubectl get hpa apollo-hpa --watch`

---

## 🧹 Unused Files (Recommended to Delete)

These files were used for the old Docker Compose manual scaling setup and are no longer needed in the Kubernetes workflow:

| File Name | Reason for Deletion |
| --------- | ------------------- |
| `start-load-balanced.sh` | Handled by Kubernetes deployments now. |
| `test-load-balancer.sh` | Superseded by `k8s-load-test-1m.sh`. |
| `nginx.conf` (root) | Configuration is now in `k8s/nginx-configmap.yaml`. |
| `setup.sh` | Old setup logic; use `npm install` and `npm run db:push` instead. |
| `START_HERE.txt` | Old instructions for Compose setup. |
| `QUICK_START.md` | Legacy documentation. |
| `GETTING_STARTED.md` | Legacy index. |
| `LOAD_BALANCER_SETUP.md` | Legacy technical details. |
| `VERIFICATION_CHECKLIST.md` | Replaced by `FRESH_INSTALL_GUIDE.md` checklist. |
| `SETUP_SUMMARY.md` | Legacy summary. |
| `SETUP_COMPLETE.md` | Legacy completion doc. |
| `FINAL_SUMMARY.md` | Legacy report. |

---

## 🛑 Stopping the Project

```bash
# Delete Kubernetes resources
kubectl delete -f k8s/

# Stop infrastructure
docker-compose down
```

---

## 📚 Technologies Used

- **Kubernetes**: Orchestration and Scaling
- **Apollo Server**: GraphQL server
- **Redis**: Shared distributed cache
- **PostgreSQL**: Shared database
- **Nginx**: In-cluster Load Balancer
- **Drizzle ORM**: Type-safe database management
- **Docker**: Containerization

---

**Last Updated**: January 26, 2026
**Environment**: Kubernetes (Docker Desktop / MiniKube)
**Status**: ✅ Kubernetes Ready | ✅ Scaling Enabled | ✅ Tested with 1M Requests
