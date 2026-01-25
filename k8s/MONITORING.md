# Kubernetes Monitoring & Autoscaling Guide

## 🔍 Monitoring Commands

### Check All Resources

```bash
# View all pods, services, and deployments
kubectl get all

# Watch pods in real-time (updates every 2 seconds)
kubectl get pods --watch

# Get detailed info about all resources
kubectl get pods,svc,deployments -o wide
```

### Check Pod Status

```bash
# List all pods
kubectl get pods

# Get detailed pod information
kubectl describe pod <pod-name>

# Check which node a pod is running on
kubectl get pods -o wide

# Check pod logs (real-time)
kubectl logs <pod-name> -f

# Check logs from all apollo pods
kubectl logs -l app=apollo --tail=50

# Check previous pod logs (if pod crashed)
kubectl logs <pod-name> --previous
```

### Check Services

```bash
# List all services
kubectl get svc

# Get detailed service information
kubectl describe svc apollo-service
kubectl describe svc nginx-service

# Test service connectivity from inside cluster
kubectl run test-pod --image=curlimages/curl -it --rm -- sh
# Inside the pod, run: curl http://apollo-service:4000/health
```

### Check Deployments

```bash
# List deployments
kubectl get deployments

# Get deployment details
kubectl describe deployment apollo

# Check deployment rollout status
kubectl rollout status deployment apollo

# View deployment history
kubectl rollout history deployment apollo
```

## 📊 Resource Usage Monitoring

### Check Resource Usage

```bash
# Install metrics-server first (required for CPU/memory metrics)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# View pod resource usage
kubectl top pods

# View node resource usage
kubectl top nodes

# Monitor specific deployment
kubectl top pods -l app=apollo
```

## 🔄 Manual Scaling

### Scale Pods Up/Down

```bash
# Scale apollo deployment to 5 replicas
kubectl scale deployment apollo --replicas=5

# Scale down to 2 replicas
kubectl scale deployment apollo --replicas=2

# Scale to 1 replica
kubectl scale deployment apollo --replicas=1

# Check scaling status
kubectl get deployment apollo
```

### Restart Pods

```bash
# Restart all pods in apollo deployment (rolling restart)
kubectl rollout restart deployment apollo

# Delete a specific pod (deployment will recreate it)
kubectl delete pod <pod-name>

# Delete all apollo pods (all will be recreated)
kubectl delete pods -l app=apollo
```

## 🚀 Horizontal Pod Autoscaler (HPA)

### What is HPA?

HPA automatically scales pods based on CPU, memory, or custom metrics.

- **Scale UP**: When resource usage exceeds threshold
- **Scale DOWN**: When resource usage is below threshold

### Prerequisites

```bash
# 1. Ensure metrics-server is installed
kubectl get deployment metrics-server -n kube-system

# If not installed:
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# For Docker Desktop, you may need to patch metrics-server:
kubectl patch deployment metrics-server -n kube-system --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'
```

### Create HPA (Method 1: Command Line)

```bash
# Create HPA for apollo deployment
# Scale between 2-10 pods based on 50% CPU usage
kubectl autoscale deployment apollo --cpu-percent=50 --min=2 --max=10

# View HPA status
kubectl get hpa

# Detailed HPA information
kubectl describe hpa apollo

# Delete HPA
kubectl delete hpa apollo
```

### Create HPA (Method 2: YAML File)

```bash
# Apply the HPA manifest (see k8s/apollo-hpa.yaml below)
kubectl apply -f k8s/apollo-hpa.yaml

# Check HPA status
kubectl get hpa apollo-hpa --watch
```

## 📈 Load Testing (Generate Traffic)

### Method 1: Simple Loop

```bash
# Generate traffic to increase load (run in separate terminal)
while true; do
  curl -s http://localhost:30080/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{users(limit:100){data{id name email}}}"}' > /dev/null
  echo "Request sent"
  sleep 0.1
done
```

### Method 2: Using Apache Bench (ab)

```bash
# Install apache bench (if not installed)
# macOS: brew install httpd
# Linux: sudo apt-get install apache2-utils

# Send 10000 requests with 100 concurrent connections
ab -n 10000 -c 100 -p graphql-query.json -T application/json \
  http://localhost:30080/graphql

# Create graphql-query.json file:
echo '{"query":"{users(limit:50){data{id name}}}"}' > graphql-query.json
```

### Method 3: Using K6 (Recommended for GraphQL)

```bash
# Install k6
# macOS: brew install k6
# Linux: https://k6.io/docs/getting-started/installation/

# Create load test script (see load-test.js below)
k6 run load-test.js
```

### Method 4: Using Hey

```bash
# Install hey
# macOS: brew install hey
# Linux: go install github.com/rakyll/hey@latest

# Generate load
hey -z 60s -c 50 -m POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{userCount}"}' \
  http://localhost:30080/graphql
```

## 🔍 Monitoring During Load Test

### Watch Everything

```bash
# Terminal 1: Watch pods scaling
watch kubectl get pods

# Terminal 2: Watch HPA status
watch kubectl get hpa

# Terminal 3: Watch resource usage
watch kubectl top pods

# Terminal 4: Generate load (use one of the methods above)
```

### Check Logs During Load

```bash
# Stream logs from all apollo pods
kubectl logs -l app=apollo -f --max-log-requests=10

# Check nginx logs
kubectl logs -l app=nginx-lb -f
```

## 📉 Scaling Behavior

### How HPA Decides to Scale

**Scale UP triggers:**

- CPU usage > 50% (based on HPA config)
- Avg CPU across all pods exceeds target
- Evaluates every 15 seconds (default)
- Adds pods gradually

**Scale DOWN triggers:**

- CPU usage consistently < 50%
- Waits 5 minutes before scaling down (stabilization)
- Removes pods gradually

### Check Why HPA Scaled

```bash
# View HPA events
kubectl describe hpa apollo-hpa

# View deployment events
kubectl describe deployment apollo

# Check all events in namespace
kubectl get events --sort-by='.lastTimestamp'
```

## 🛠️ Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl get pods

# View pod details
kubectl describe pod <pod-name>

# Check pod logs
kubectl logs <pod-name>

# Check previous logs (if crashed)
kubectl logs <pod-name> --previous
```

### HPA Not Working

```bash
# Check metrics-server
kubectl get deployment metrics-server -n kube-system

# Check if metrics are available
kubectl top pods

# View HPA status
kubectl describe hpa apollo-hpa

# Check pod resource requests/limits are set
kubectl describe deployment apollo | grep -A 5 "Limits\|Requests"
```

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints apollo-service

# Check if pods are ready
kubectl get pods -l app=apollo

# Test service from inside cluster
kubectl run test-pod --image=curlimages/curl -it --rm -- \
  curl http://apollo-service:4000/health
```

## 📊 Useful Dashboards

### Quick Status Check

```bash
# One command to see everything
kubectl get pods,svc,hpa,deployments

# Watch resource usage
watch 'kubectl top pods && echo "" && kubectl get hpa'
```

### Port Forward for Direct Access

```bash
# Access a specific pod directly
kubectl port-forward pod/<pod-name> 4000:4000

# Access service
kubectl port-forward svc/apollo-service 4000:4000

# Access nginx
kubectl port-forward svc/nginx-service 8080:80
```

## 🧹 Cleanup Commands

```bash
# Delete specific resources
kubectl delete deployment apollo
kubectl delete service apollo-service
kubectl delete hpa apollo-hpa

# Delete everything from k8s/ directory
kubectl delete -f k8s/

# Delete all resources in current namespace
kubectl delete all --all

# Delete specific pod
kubectl delete pod <pod-name>

# Force delete stuck pod
kubectl delete pod <pod-name> --force --grace-period=0
```

## 📝 Best Practices

1. **Always set resource requests/limits** - Required for HPA
2. **Monitor metrics** - Use `kubectl top pods` regularly
3. **Check logs** - Use `kubectl logs -f` when debugging
4. **Use labels** - Makes filtering easier (`kubectl get pods -l app=apollo`)
5. **Test autoscaling** - Verify HPA works before production
6. **Set appropriate min/max replicas** - Don't set max too high
7. **Monitor costs** - More pods = more resources

## 🎯 Quick Reference

```bash
# Most used commands
kubectl get pods                    # List pods
kubectl get hpa                     # Check autoscaling
kubectl top pods                    # Resource usage
kubectl logs <pod> -f               # Stream logs
kubectl describe pod <pod>          # Pod details
kubectl scale deployment apollo --replicas=N  # Manual scale
kubectl rollout restart deployment apollo     # Restart pods
```
