# 🚀 Kubernetes Load Test Guide - 1 Million Requests

This guide shows you how to run a 1 million request load test and monitor pod autoscaling in real-time.

## Quick Start

### Run the Complete Load Test

```bash
chmod +x k8s-load-test-1m.sh
./k8s-load-test-1m.sh
```

This single script will:

1. ✅ Check prerequisites (kubectl, Docker, Kubernetes cluster)
2. ✅ Build Docker image if needed
3. ✅ Start PostgreSQL and Redis containers
4. ✅ Deploy application to Kubernetes
5. ✅ Setup Horizontal Pod Autoscaler (HPA)
6. ✅ Send 1,000,000 requests with 100 concurrent workers
7. ✅ Monitor pod scaling in real-time
8. ✅ Generate detailed report

---

## Manual Step-by-Step Setup

If you prefer to run each step manually:

### 1. Build and Push Image

```bash
docker build -t apollo-server-with-redis-apollo-server:latest .
```

### 2. Start Database and Cache

```bash
# PostgreSQL
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=apollo_db \
  -p 5438:5432 \
  postgres:15-alpine

# Redis
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 3. Deploy to Kubernetes

```bash
# Deploy application
kubectl apply -f k8s/apollo-deployment.yaml
kubectl apply -f k8s/apollo-service.yaml
kubectl apply -f k8s/nginx-configmap.yaml
kubectl apply -f k8s/nginx-deployment.yaml
kubectl apply -f k8s/nginx-service.yaml

# Wait for pods to be ready
kubectl wait --for=condition=available --timeout=120s deployment/apollo
kubectl wait --for=condition=available --timeout=120s deployment/nginx-lb
```

### 4. Setup Metrics Server (Required for HPA)

```bash
# Install metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Patch for local development (Docker Desktop/Minikube)
kubectl patch deployment metrics-server -n kube-system --type='json' \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'

# Wait for it to be ready
kubectl wait --for=condition=available --timeout=120s deployment/metrics-server -n kube-system

# Wait 15 seconds for metrics to populate
sleep 15
```

### 5. Deploy Horizontal Pod Autoscaler

```bash
kubectl apply -f k8s/apollo-hpa.yaml

# Check HPA status
kubectl get hpa apollo-hpa
```

The HPA is configured to:

- **Min replicas**: 2
- **Max replicas**: 50
- **Target CPU**: 80%
- **Target Memory**: 70%

### 6. Monitor Pods (Open in New Terminal)

```bash
# Watch pods scale in real-time
watch -n 2 'kubectl get hpa && echo && kubectl get pods -l app=apollo && echo && kubectl top pods -l app=apollo'
```

### 7. Run Load Test (In Original Terminal)

**Option A: Using the automated script** (Recommended)

```bash
./k8s-load-test-1m.sh
```

**Option B: Using Apache Bench** (if installed)

```bash
# Send 1 million requests, 100 concurrent
ab -n 1000000 -c 100 \
  -p <(echo '{"query":"{users(limit:50){data{id name email}}}"}') \
  -T "application/json" \
  http://localhost:30080/graphql
```

**Option C: Using Hey** (if installed)

```bash
# Install: brew install hey

# Send requests for ~15 minutes
hey -n 1000000 -c 100 -m POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{users(limit:50){data{id name email}}}"}' \
  http://localhost:30080/graphql
```

**Option D: Using curl** (built-in)

```bash
# Simple bash loop (slower but no dependencies)
for i in {1..1000000}; do
  curl -s -X POST http://localhost:30080/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{userCount}"}' > /dev/null &

  # Limit to 100 concurrent
  if (( i % 100 == 0 )); then
    wait
  fi

  # Progress
  if (( i % 10000 == 0 )); then
    echo "Completed: $i / 1,000,000"
  fi
done
wait
```

---

## Monitoring During Load Test

### Real-Time Monitoring Commands

**Watch HPA and Pods**

```bash
watch -n 2 'kubectl get hpa apollo-hpa && echo && kubectl get pods -l app=apollo'
```

**Watch Resource Usage**

```bash
watch -n 2 'kubectl top pods -l app=apollo'
```

**Stream Logs**

```bash
kubectl logs -l app=apollo --tail=100 -f
```

**View Scaling Events**

```bash
kubectl get events --sort-by='.lastTimestamp' | grep -i scaled
```

**Describe HPA (detailed info)**

```bash
kubectl describe hpa apollo-hpa
```

### What to Observe

During the load test, you should see:

1. **CPU/Memory Increase**: As requests come in, CPU and memory usage rises
2. **HPA Triggers**: When CPU > 80% or Memory > 70%, HPA will add pods
3. **Pods Scaling Up**: New pods will be created (up to 50 max)
4. **Load Distribution**: Nginx distributes requests across all pods
5. **Stabilization**: After load stops, pods will scale down after ~5 minutes

### Expected Behavior

```
Initial State:
  - 2 pods running (minReplicas: 2)

During Load Test:
  - CPU hits 80%+ → HPA adds pods
  - Can scale up to 50 pods (maxReplicas: 50)
  - Scaling happens gradually (not all at once)

After Load Test:
  - Wait 5 minutes (stabilizationWindowSeconds: 300)
  - Pods scale down to 2 gradually
```

---

## Understanding the Results

### Check Final Pod Count

```bash
# How many pods are running?
kubectl get pods -l app=apollo

# Count them
kubectl get pods -l app=apollo --no-headers | wc -l
```

### View Scaling History

```bash
# See when pods were added/removed
kubectl describe hpa apollo-hpa

# Recent scaling events
kubectl get events --sort-by='.lastTimestamp' | grep apollo
```

### View Load Test Logs

The automated script creates logs in the `logs/` directory:

```bash
# View the latest log
ls -lt logs/
tail -f logs/load-test-*.log
```

### Metrics Analysis

```bash
# Current resource usage
kubectl top pods -l app=apollo

# Node usage
kubectl top nodes
```

---

## Performance Expectations

### With 1 Million Requests

**100 Concurrent Workers**

- Duration: ~5-10 minutes
- Rate: ~2,000-3,000 requests/second
- Expected pods: 10-30 (depending on query complexity)

**Configuration affects scaling:**

- Simple queries (e.g., `{userCount}`) → fewer pods needed
- Complex queries (e.g., fetching 100 users with relations) → more pods needed
- CPU-intensive queries → faster scaling
- I/O-bound queries → may need memory scaling

---

## Troubleshooting

### HPA Not Scaling

```bash
# Check if metrics-server is working
kubectl get apiservice v1beta1.metrics.k8s.io -o yaml

# Check metrics are available
kubectl top pods -l app=apollo

# Check HPA status
kubectl describe hpa apollo-hpa
```

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -l app=apollo

# View pod logs
kubectl logs -l app=apollo --tail=50

# Describe failing pod
kubectl describe pod <pod-name>
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check if Redis is running
docker ps | grep redis

# Test connection from a pod
kubectl exec -it <pod-name> -- wget -O- http://host.docker.internal:5438
```

### Load Test Script Issues

```bash
# Make script executable
chmod +x k8s-load-test-1m.sh

# Run with bash explicitly
bash k8s-load-test-1m.sh

# Check endpoint is accessible
curl http://localhost:30080/health
```

---

## Cleanup

### Scale Down Pods Manually

```bash
# Scale to 2 replicas immediately
kubectl scale deployment apollo --replicas=2
```

### Remove HPA

```bash
kubectl delete hpa apollo-hpa
```

### Delete All Kubernetes Resources

```bash
kubectl delete -f k8s/
```

### Stop Docker Containers

```bash
docker stop postgres redis
docker rm postgres redis
```

### Clean Everything

```bash
# Kubernetes
kubectl delete -f k8s/

# Docker containers
docker stop postgres redis && docker rm postgres redis

# Logs
rm -rf logs/
```

---

## Advanced: Customize Load Test

### Modify Request Count

Edit `k8s-load-test-1m.sh`:

```bash
TOTAL_REQUESTS=5000000  # Change to 5 million
CONCURRENT_WORKERS=200   # More workers
```

### Modify HPA Settings

Edit [k8s/apollo-hpa.yaml](k8s/apollo-hpa.yaml):

```yaml
spec:
  minReplicas: 3 # Start with 3 pods
  maxReplicas: 100 # Allow up to 100 pods
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70 # Scale at 70% CPU
```

Then apply:

```bash
kubectl apply -f k8s/apollo-hpa.yaml
```

### Use Different Queries

Edit the `QUERIES` array in `k8s-load-test-1m.sh`:

```bash
QUERIES=(
    '{"query":"{users(limit:100){data{id name email createdAt}}}"}'
    '{"query":"{posts(limit:200){data{id title content}}}"}'
    # Add your queries here
)
```

---

## Next Steps

- 📊 Check [k8s/MONITORING.md](k8s/MONITORING.md) for monitoring setup
- 📈 Setup Prometheus/Grafana for advanced metrics
- 🔍 Analyze performance bottlenecks
- ⚡ Optimize queries based on load test results
- 🌐 Test with different traffic patterns

---

## Questions?

- Check [k8s/README.md](k8s/README.md) for basic Kubernetes setup
- View [GETTING_STARTED.md](GETTING_STARTED.md) for Docker Compose setup
- Review [ARCHITECTURE.md](ARCHITECTURE.md) for system design
