# 🚀 Fresh Install Guide - Clone & Run on New Machine

Complete step-by-step guide to get this project running from scratch on a new machine.

---

## 📋 Prerequisites

Install these before starting:

### 1. Docker Desktop

- **Download**: https://www.docker.com/products/docker-desktop
- **Enable Kubernetes**: Docker Desktop → Settings → Kubernetes → Enable Kubernetes
- **Verify**:
  ```bash
  docker --version
  kubectl version --client
  ```

### 2. Node.js (v20 or higher)

- **Download**: https://nodejs.org/
- **Verify**:
  ```bash
  node --version
  npm --version
  ```

### 3. Git

- **Download**: https://git-scm.com/
- **Verify**:
  ```bash
  git --version
  ```

---

## 🎯 Quick Start (5 Commands)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd apollo-server-with-redis

# 2. Install dependencies
npm install

# 3. Start infrastructure (PostgreSQL + Redis)
docker-compose up -d

# 4. Setup database
npm run db:push
npm run db:seed:1000:graphql

# 5. Run with Kubernetes
./k8s-load-test-1m.sh
```

---

## 📝 Detailed Step-by-Step Guide

### Step 1: Clone the Repository

```bash
# Clone from your repository
git clone <your-repo-url>

# Navigate to project directory
cd apollo-server-with-redis

# Verify files exist
ls -la
```

**Expected files:**

- `package.json`
- `docker-compose.yml`
- `Dockerfile`
- `k8s/` directory
- `src/` directory

---

### Step 2: Install Dependencies

```bash
npm install
```

**What this does:**

- ✅ Installs all Node.js packages
- ✅ Installs TypeScript, Drizzle ORM, Apollo Server, etc.
- ✅ Creates `node_modules/` directory

**Verify:**

```bash
ls node_modules/
```

---

### Step 3: Start Database & Redis (Docker)

```bash
# Start PostgreSQL and Redis containers
docker-compose up -d

# Verify containers are running
docker ps
```

**Expected output:**

```
CONTAINER ID   IMAGE                 STATUS          PORTS
xxxxxxxxxxxx   postgres:16-alpine    Up 2 seconds    0.0.0.0:5438->5432/tcp
xxxxxxxxxxxx   redis:7-alpine        Up 2 seconds    0.0.0.0:6379->6379/tcp
```

**Verify services:**

```bash
# Test PostgreSQL connection
docker exec -it <postgres-container-id> psql -U postgres -d apollo_db -c "SELECT version();"

# Test Redis connection
docker exec -it <redis-container-id> redis-cli PING
# Expected: PONG
```

---

### Step 4: Setup Database Schema

```bash
# Push schema to database (creates tables)
npm run db:push

# Seed with 1000 test users (optional but recommended)
npm run db:seed:1000:graphql
```

**What this does:**

- ✅ Creates `users`, `posts`, `comments`, `cache_sessions` tables
- ✅ Inserts 1000+ test users
- ✅ Database is ready for GraphQL queries

**Verify:**

```bash
# Check if tables exist
docker exec -it <postgres-container-id> psql -U postgres -d apollo_db -c "\dt"

# Check user count
docker exec -it <postgres-container-id> psql -U postgres -d apollo_db -c "SELECT COUNT(*) FROM users;"
```

---

### Step 5: Build Docker Image for Kubernetes

```bash
# Build the Apollo server image
docker build -t apollo-server-with-redis-apollo-server:latest .

# Verify image was created
docker images | grep apollo-server
```

**Expected output:**

```
REPOSITORY                                    TAG       SIZE
apollo-server-with-redis-apollo-server        latest    ~200MB
```

---

### Step 6: Deploy to Kubernetes

```bash
# Apply all Kubernetes manifests
kubectl apply -f k8s/apollo-deployment.yaml
kubectl apply -f k8s/apollo-service.yaml
kubectl apply -f k8s/nginx-configmap.yaml
kubectl apply -f k8s/nginx-deployment.yaml
kubectl apply -f k8s/nginx-service.yaml
kubectl apply -f k8s/apollo-hpa.yaml

# Or apply all at once
kubectl apply -f k8s/
```

**Wait for pods to be ready:**

```bash
# Watch pods starting up
kubectl get pods --watch

# Press Ctrl+C when all pods show "Running" status
```

**Expected output (after ~30-60 seconds):**

```
NAME                                  READY   STATUS    RESTARTS   AGE
apollo-xxxxxxxxxx-xxxxx               1/1     Running   0          45s
apollo-xxxxxxxxxx-xxxxx               1/1     Running   0          45s
apollo-xxxxxxxxxx-xxxxx               1/1     Running   0          45s
nginx-loadbalancer-xxxxxxxxxx-xxxxx   1/1     Running   0          45s
```

---

### Step 7: Verify Kubernetes Deployment

```bash
# Check all resources
kubectl get all

# Check services
kubectl get svc

# Check HPA (autoscaler)
kubectl get hpa
```

**Expected services:**

```
NAME                TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
apollo-service      ClusterIP   10.96.xxx.xxx   <none>        4000/TCP       1m
nginx-service       NodePort    10.96.xxx.xxx   <none>        80:30080/TCP   1m
```

---

### Step 8: Test the Application

#### A. Health Check

```bash
curl http://localhost:30080/health
```

**Expected:** `healthy`

#### B. GraphQL Query

```bash
curl -X POST http://localhost:30080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{userCount}"}'
```

**Expected:**

```json
{ "data": { "userCount": 1007 } }
```

#### C. Fetch Users

```bash
curl -X POST http://localhost:30080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{users(limit:5){data{id name email}}}"}'
```

**Expected:**

```json
{
  "data": {
    "users": {
      "data": [
        {"id":"...","name":"John Doe","email":"john@example.com"},
        ...
      ]
    }
  }
}
```

#### D. Open Browser

Navigate to: **http://localhost:30080/graphql**

You should see the GraphQL Playground interface.

Try this query:

```graphql
{
  users(limit: 10) {
    data {
      id
      name
      email
      createdAt
    }
    total
  }
}
```

---

## ✅ Verification Checklist

Run through this checklist to ensure everything is working:

- [ ] **Docker containers running**

  ```bash
  docker ps | grep -E "postgres|redis"
  # Should show 2 containers
  ```

- [ ] **Kubernetes pods running**

  ```bash
  kubectl get pods
  # All pods should show "Running" status
  ```

- [ ] **Services accessible**

  ```bash
  kubectl get svc
  # nginx-service should show NodePort 30080
  ```

- [ ] **Health endpoint works**

  ```bash
  curl http://localhost:30080/health
  # Should return: healthy
  ```

- [ ] **GraphQL endpoint works**

  ```bash
  curl -X POST http://localhost:30080/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{userCount}"}'
  # Should return user count
  ```

- [ ] **Browser access works**
  - Open: http://localhost:30080/graphql
  - GraphQL Playground should load
  - Run a test query

- [ ] **Database has data**

  ```bash
  docker exec -it <postgres-container-id> psql -U postgres -d apollo_db -c "SELECT COUNT(*) FROM users;"
  # Should show 1000+ users
  ```

- [ ] **HPA is configured**

  ```bash
  kubectl get hpa
  # Should show apollo-hpa
  ```

- [ ] **Metrics server working**
  ```bash
  kubectl top pods
  # Should show CPU and memory usage
  ```

---

## 🔍 Troubleshooting Common Issues

### Issue 1: Docker containers won't start

**Symptom:**

```bash
docker-compose up -d
# Error: port already in use
```

**Solution:**

```bash
# Check what's using the ports
lsof -i :5438  # PostgreSQL
lsof -i :6379  # Redis

# Kill processes or change ports in docker-compose.yml
```

---

### Issue 2: Kubernetes pods stuck in "Pending"

**Symptom:**

```bash
kubectl get pods
# Shows: STATUS = Pending
```

**Solution:**

```bash
# Check pod details
kubectl describe pod <pod-name>

# Common causes:
# 1. Not enough resources → Close other applications
# 2. Image not found → Rebuild: docker build -t apollo-server-with-redis-apollo-server:latest .
```

---

### Issue 3: Pods in "CrashLoopBackOff"

**Symptom:**

```bash
kubectl get pods
# Shows: STATUS = CrashLoopBackOff
```

**Solution:**

```bash
# Check pod logs
kubectl logs <pod-name>

# Common causes:
# 1. Database connection failed → Verify docker-compose is running
# 2. Missing environment variables → Check apollo-deployment.yaml
```

**Fix database connection:**

```bash
# Verify PostgreSQL is accessible
docker ps | grep postgres

# Test connection from your machine
psql postgresql://postgres:postgres@localhost:5438/apollo_db
```

---

### Issue 4: "Cannot connect to localhost:30080"

**Symptom:**

```bash
curl http://localhost:30080/health
# curl: (7) Failed to connect to localhost port 30080
```

**Solution:**

```bash
# Check nginx service
kubectl get svc nginx-service

# Should show: 80:30080/TCP

# If missing:
kubectl apply -f k8s/nginx-service.yaml

# Check nginx pod status
kubectl get pods -l app=nginx-lb
kubectl logs -l app=nginx-lb
```

---

### Issue 5: HPA not scaling

**Symptom:**

```bash
kubectl get hpa
# Shows: <unknown> for TARGETS
```

**Solution:**

```bash
# Install metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Patch for local development
kubectl patch deployment metrics-server -n kube-system --type='json' \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'

# Wait for it to be ready
kubectl wait --for=condition=available --timeout=120s deployment/metrics-server -n kube-system

# Wait 30 seconds for metrics to populate
sleep 30

# Verify
kubectl top pods
```

---

### Issue 6: "npm run db:push" fails

**Symptom:**

```bash
npm run db:push
# Error: Connection refused
```

**Solution:**

```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check DATABASE_URL in .env or environment
echo $DATABASE_URL

# Should be: postgresql://postgres:postgres@localhost:5438/apollo_db

# Test connection
psql postgresql://postgres:postgres@localhost:5438/apollo_db -c "SELECT 1;"
```

---

## 🧪 Run Load Test (1 Million Requests)

Once everything is verified, run the load test:

```bash
# Make script executable
chmod +x k8s-load-test-1m.sh

# Run load test
./k8s-load-test-1m.sh
```

**In a separate terminal, watch scaling:**

```bash
watch -n 2 'kubectl get hpa && echo && kubectl get pods -l app=apollo'
```

**What you'll see:**

1. Initial: 2-3 pods running
2. During load: Pods scale up (can reach 10-50 depending on query complexity)
3. After load: Pods scale down after ~5 minutes
4. Logs saved to: `logs/load-test-YYYYMMDD-HHMMSS.log`

---

## 📊 Monitoring Commands

### View All Resources

```bash
kubectl get all
```

### Watch Pods in Real-Time

```bash
kubectl get pods --watch
```

### View Pod Logs

```bash
# All apollo pods
kubectl logs -l app=apollo --tail=50 -f

# Specific pod
kubectl logs <pod-name> -f

# Nginx logs
kubectl logs -l app=nginx-lb -f
```

### View Resource Usage

```bash
kubectl top pods
kubectl top nodes
```

### View HPA Status

```bash
kubectl get hpa --watch
```

### View Scaling Events

```bash
kubectl describe hpa apollo-hpa
kubectl get events --sort-by='.lastTimestamp' | grep -i scaled
```

---

## 🛑 Stop Everything

### Stop Kubernetes

```bash
# Delete all Kubernetes resources
kubectl delete -f k8s/

# Verify nothing is running
kubectl get all
```

### Stop Docker Containers

```bash
# Stop PostgreSQL and Redis
docker-compose down

# Verify containers stopped
docker ps
```

### Clean Up (Optional)

```bash
# Remove Docker volumes (deletes data)
docker-compose down -v

# Remove Docker images
docker rmi apollo-server-with-redis-apollo-server:latest

# Remove node_modules
rm -rf node_modules/
```

---

## 📚 Summary - Complete Workflow

```bash
# ===== SETUP (One Time) =====
git clone <repo>
cd apollo-server-with-redis
npm install
docker-compose up -d
npm run db:push
npm run db:seed:1000:graphql

# ===== BUILD & DEPLOY =====
docker build -t apollo-server-with-redis-apollo-server:latest .
kubectl apply -f k8s/

# ===== VERIFY =====
kubectl get pods --watch                          # Wait for Running status
curl http://localhost:30080/health                # Test health
curl -X POST http://localhost:30080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{userCount}"}'                    # Test GraphQL
open http://localhost:30080/graphql               # Open in browser

# ===== LOAD TEST (Optional) =====
./k8s-load-test-1m.sh                             # Run load test
# In another terminal:
watch -n 2 'kubectl get hpa && kubectl get pods'  # Watch scaling

# ===== MONITOR =====
kubectl get all                                   # View all resources
kubectl logs -l app=apollo -f                     # View logs
kubectl top pods                                  # View resource usage

# ===== STOP =====
kubectl delete -f k8s/                            # Stop Kubernetes
docker-compose down                               # Stop Docker
```

---

## 🎓 Next Steps

After successful verification:

1. **Read the guides:**
   - [SETUP-GUIDE.md](SETUP-GUIDE.md) - Detailed architecture explanation
   - [K8S_LOAD_TEST_GUIDE.md](K8S_LOAD_TEST_GUIDE.md) - Load testing guide
   - [GETTING_STARTED.md](GETTING_STARTED.md) - General overview

2. **Experiment:**
   - Modify GraphQL queries
   - Add new resolvers
   - Change HPA settings
   - Test different load patterns

3. **Production considerations:**
   - Use managed databases (AWS RDS, Google Cloud SQL)
   - Use managed Redis (AWS ElastiCache, Redis Cloud)
   - Deploy to real Kubernetes cluster (EKS, GKE, AKS)
   - Setup monitoring (Prometheus, Grafana)
   - Configure CI/CD pipeline

---

## ❓ Need Help?

**Common commands:**

```bash
# Check Kubernetes cluster is running
kubectl cluster-info

# Check Docker is running
docker info

# View all running containers
docker ps -a

# View all Kubernetes resources
kubectl get all --all-namespaces

# Reset Kubernetes (Docker Desktop)
# Docker Desktop → Troubleshoot → Reset Kubernetes Cluster
```

**Helpful resources:**

- Docker Desktop: https://docs.docker.com/desktop/
- Kubernetes: https://kubernetes.io/docs/home/
- kubectl cheatsheet: https://kubernetes.io/docs/reference/kubectl/cheatsheet/

---

🎉 **You're all set! Happy coding!**
