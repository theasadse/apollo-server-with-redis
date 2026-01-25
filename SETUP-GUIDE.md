# 🚀 Apollo Server with Redis - Complete Setup Guide

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR MACHINE                              │
│                                                              │
│  Browser/Client                                              │
│       │                                                      │
│       │ http://localhost:30080/graphql                       │
│       ▼                                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           KUBERNETES CLUSTER                          │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Nginx Service (NodePort :30080)            │    │  │
│  │  │  - Exposes nginx to external world          │    │  │
│  │  └───────────────────┬─────────────────────────┘    │  │
│  │                      │                               │  │
│  │                      ▼                               │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Nginx Pod (Load Balancer)                  │    │  │
│  │  │  - Routes traffic to apollo pods            │    │  │
│  │  │  - Uses nginx.conf configuration            │    │  │
│  │  └───────────────────┬─────────────────────────┘    │  │
│  │                      │                               │  │
│  │                      │ proxy_pass                    │  │
│  │                      ▼                               │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Apollo Service (ClusterIP :4000)           │    │  │
│  │  │  - Internal load balancer                   │    │  │
│  │  │  - Distributes requests to apollo pods      │    │  │
│  │  └───────────────────┬─────────────────────────┘    │  │
│  │                      │                               │  │
│  │              ┌───────┴───────┬──────────────┐       │  │
│  │              ▼               ▼              ▼       │  │
│  │  ┌──────────────┐ ┌──────────────┐  ┌──────────┐  │  │
│  │  │ Apollo Pod 1 │ │ Apollo Pod 2 │..│ Apollo N │  │  │
│  │  │ :4000        │ │ :4000        │  │ :4000    │  │  │
│  │  └──────┬───────┘ └──────┬───────┘  └────┬─────┘  │  │
│  │         │                 │               │         │  │
│  │         │                 │               │         │  │
│  │  ┌──────┴─────────────────┴───────────────┴─────┐  │  │
│  │  │  HPA (Horizontal Pod Autoscaler)             │  │  │
│  │  │  - Monitors CPU/Memory (80% threshold)       │  │  │
│  │  │  - Scales pods: min 2, max 50                │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │                                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                      │                                     │
│                      │ host.docker.internal               │
│                      ▼                                     │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           DOCKER CONTAINERS                          │  │
│  │                                                      │  │
│  │  ┌──────────────────────┐  ┌──────────────────────┐│  │
│  │  │  Postgres            │  │  Redis               ││  │
│  │  │  localhost:5438      │  │  localhost:6379      ││  │
│  │  │  - Stores users      │  │  - Caches queries    ││  │
│  │  │  - Stores posts      │  │  - Session storage   ││  │
│  │  │  - Stores comments   │  │                      ││  │
│  │  └──────────────────────┘  └──────────────────────┘│  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure & Explanations

### **1. Dockerfile**

**Location:** `/Dockerfile`  
**Purpose:** Builds the Apollo GraphQL server container image

```dockerfile
# Two-stage build for smaller image size
# Stage 1: Build TypeScript → JavaScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                    # Install all dependencies
COPY . .
RUN npm run build             # Compile TypeScript to dist/

# Stage 2: Runtime image (production)
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl   # For health checks
COPY package*.json ./
RUN npm ci --omit=dev         # Install only production deps
COPY --from=builder /app/dist ./dist  # Copy compiled code
EXPOSE 4000                   # Default port
CMD ["npm", "start"]          # Runs: node dist/index.js
```

**Connection:**

- Kubernetes reads this to build pods
- Image tagged as: `apollo-server-with-redis-apollo-server:latest`
- Each K8s pod runs a container from this image

---

### **2. docker-compose.yml**

**Location:** `/docker-compose.yml`  
**Purpose:** Runs ONLY infrastructure (Postgres + Redis)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5438:5432" # Host:Container
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: apollo_db
    volumes:
      - postgres_data:/var/lib/postgresql/data # Persistent storage

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes # Persistence enabled
    volumes:
      - redis_data:/data
```

**Connection:**

- K8s pods connect via `host.docker.internal:5438` (Postgres)
- K8s pods connect via `host.docker.internal:6379` (Redis)
- Data persists in Docker volumes even when containers restart

---

### **3. nginx.conf**

**Location:** `/nginx.conf`  
**Purpose:** Load balancer configuration for routing traffic

```nginx
http {
    upstream apollo_backend {
        # NO LONGER USED - kept for reference
        # Old static configuration before Kubernetes
    }

    server {
        listen 80;

        location /graphql {
            # Routes ALL GraphQL requests to Kubernetes service
            proxy_pass http://apollo-service:4000;

            # Preserve original client info
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

            # WebSocket support (for GraphQL subscriptions)
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        location /health {
            # Health check endpoint
            proxy_pass http://apollo-service:4000/health;
        }
    }
}
```

**Connection:**

- `apollo-service:4000` → K8s ClusterIP service
- K8s service automatically load balances across all apollo pods
- No need for manual upstream configuration

---

## 🔧 Kubernetes Files Explained

### **4. k8s/apollo-deployment.yaml**

**Purpose:** Defines how Apollo pods should run

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: apollo
spec:
  replicas: 3 # Initial pod count (HPA will adjust)
  selector:
    matchLabels:
      app: apollo # Pods with this label
  template:
    metadata:
      labels:
        app: apollo
    spec:
      containers:
        - name: apollo
          image: apollo-server-with-redis-apollo-server:latest
          imagePullPolicy: IfNotPresent # Use local image
          ports:
            - containerPort: 4000
          env:
            - name: PORT
              value: "4000"
            - name: INSTANCE_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name # Unique pod name
            - name: DATABASE_URL
              value: "postgresql://postgres:postgres@host.docker.internal:5438/apollo_db"
            - name: REDIS_URL
              value: "redis://host.docker.internal:6379"

          resources:
            requests: # Minimum guaranteed
              cpu: 200m # 0.2 CPU cores
              memory: 256Mi
            limits: # Maximum allowed
              cpu: 1000m # 1 CPU core
              memory: 512Mi

          readinessProbe: # Is pod ready to receive traffic?
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 5

          livenessProbe: # Is pod still alive?
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 15
            periodSeconds: 20
```

**Connection:**

- Creates pods from Dockerfile image
- Pods connect to Docker containers via `host.docker.internal`
- Labels (`app: apollo`) link to Service

---

### **5. k8s/apollo-service.yaml**

**Purpose:** Internal load balancer for apollo pods

```yaml
apiVersion: v1
kind: Service
metadata:
  name: apollo-service
spec:
  type: ClusterIP # Internal only (not exposed outside)
  selector:
    app: apollo # Routes to pods with this label
  ports:
    - protocol: TCP
      port: 4000 # Service listens on :4000
      targetPort: 4000 # Forwards to pod's :4000
```

**Connection:**

- Nginx calls `apollo-service:4000`
- Service distributes traffic across all `app: apollo` pods
- Automatic service discovery (no IPs needed)

---

### **6. k8s/apollo-hpa.yaml**

**Purpose:** Auto-scales apollo pods based on load

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: apollo-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: apollo # Scales the apollo deployment
  minReplicas: 2 # Never go below 2 pods
  maxReplicas: 50 # Never exceed 50 pods
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 80 # Scale up if avg CPU > 80%
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70 # Scale up if avg memory > 70%

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0 # Scale up immediately
      policies:
        - type: Percent
          value: 100 # Can double pod count
          periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300 # Wait 5 min before scaling down
      policies:
        - type: Percent
          value: 50 # Can halve pod count
          periodSeconds: 15
```

**Connection:**

- Monitors apollo deployment's CPU/memory
- Adjusts `replicas` count automatically
- Requires `metrics-server` to be installed

---

### **7. k8s/nginx-configmap.yaml**

**Purpose:** Stores nginx.conf as Kubernetes resource

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  nginx.conf: |
    # Entire nginx.conf file content here
    # Gets mounted as a file in nginx pod
```

**Connection:**

- ConfigMap stores configuration data
- Nginx pod mounts this as `/etc/nginx/nginx.conf`
- Changes require pod restart to apply

---

### **8. k8s/nginx-deployment.yaml**

**Purpose:** Runs nginx load balancer pod

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-loadbalancer
spec:
  replicas: 1 # Only 1 nginx needed
  selector:
    matchLabels:
      app: nginx-lb
  template:
    metadata:
      labels:
        app: nginx-lb
    spec:
      containers:
        - name: nginx
          image: nginx:alpine
          ports:
            - containerPort: 80
          volumeMounts:
            - name: nginx-config
              mountPath: /etc/nginx/nginx.conf
              subPath: nginx.conf # Mount ConfigMap as file
      volumes:
        - name: nginx-config
          configMap:
            name: nginx-config # References ConfigMap above
```

**Connection:**

- Runs 1 nginx instance
- Mounts `nginx-config` ConfigMap
- Nginx proxies to `apollo-service`

---

### **9. k8s/nginx-service.yaml**

**Purpose:** Exposes nginx to outside world

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  type: NodePort # Exposes on host machine
  selector:
    app: nginx-lb # Routes to nginx pod
  ports:
    - protocol: TCP
      port: 80 # Service listens on :80
      targetPort: 80 # Forwards to nginx pod's :80
      nodePort: 30080 # Exposed on host as :30080
```

**Connection:**

- `localhost:30080` → nginx pod :80
- Nginx pod → apollo-service :4000
- Apollo service → apollo pods :4000

---

## 🚀 How to Start the Project

### **Prerequisites**

```bash
# Check installations
docker --version          # Docker Desktop with Kubernetes enabled
kubectl version          # Should show client and server version
node --version           # Node.js 20+
```

---

### **Step 1: Start Infrastructure (Docker)**

```bash
# Start Postgres + Redis
docker-compose up -d

# Verify they're running
docker ps | grep -E "postgres|redis"

# Check logs if needed
docker-compose logs -f
```

**What this does:**

- ✅ Postgres running on `localhost:5438`
- ✅ Redis running on `localhost:6379`
- ✅ Data persists in Docker volumes

---

### **Step 2: Setup Database**

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:push

# (Optional) Seed database with test data
npm run db:seed:1000:graphql
```

**What this does:**

- ✅ Creates tables (users, posts, comments, cache_sessions)
- ✅ Applies schema from `src/db/schema.ts`
- ✅ Seeds 1000+ test users (optional)

---

### **Step 3: Build Docker Image for Kubernetes**

```bash
# Build the Apollo server image
docker build -t apollo-server-with-redis-apollo-server:latest .

# Verify image exists
docker images | grep apollo-server
```

**What this does:**

- ✅ Compiles TypeScript → JavaScript
- ✅ Creates optimized production image
- ✅ Tags image for Kubernetes to use

---

### **Step 4: Deploy to Kubernetes**

```bash
# Apply all Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods,svc,hpa

# Wait for pods to be ready (may take 30-60 seconds)
kubectl get pods --watch
```

**What this does:**

- ✅ Creates apollo deployment (3 initial pods)
- ✅ Creates apollo-service (internal load balancer)
- ✅ Creates nginx deployment (1 pod)
- ✅ Creates nginx-service (exposes on :30080)
- ✅ Creates HPA (autoscaler)
- ✅ Loads nginx config from ConfigMap

---

### **Step 5: Verify Everything Works**

```bash
# Test GraphQL endpoint
curl http://localhost:30080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{userCount}"}'

# Expected output: {"data":{"userCount":1007}}

# Test health endpoint
curl http://localhost:30080/health

# Expected output: healthy
```

---

### **Step 6: Access GraphQL Playground**

Open your browser:

```
http://localhost:30080/graphql
```

Try queries:

```graphql
{
  userCount
}

{
  users(limit: 5) {
    data {
      id
      name
      email
    }
  }
}
```

---

## 📊 Monitoring & Scaling

### **Watch Autoscaling**

```bash
# Terminal 1: Watch HPA
kubectl get hpa --watch

# Terminal 2: Watch pods
kubectl get pods -l app=apollo --watch

# Terminal 3: Generate load
ab -n 100000 -c 200 \
  -p <(echo '{"query":"{users(limit:100){data{id name}}}"}') \
  -T "application/json" \
  http://localhost:30080/graphql
```

### **Check Resource Usage**

```bash
# Pod CPU/Memory
kubectl top pods

# Deployment status
kubectl get deployments

# HPA details
kubectl describe hpa apollo-hpa
```

### **View Logs**

```bash
# All apollo pods
kubectl logs -l app=apollo --tail=50

# Specific pod
kubectl logs <pod-name> -f

# Nginx pod
kubectl logs -l app=nginx-lb -f
```

---

## 🔄 Common Operations

### **Scale Manually**

```bash
# Scale to 10 pods
kubectl scale deployment apollo --replicas=10

# Scale down to 2
kubectl scale deployment apollo --replicas=2
```

### **Restart Pods**

```bash
# Rolling restart (zero downtime)
kubectl rollout restart deployment apollo

# Delete specific pod (auto-recreates)
kubectl delete pod <pod-name>
```

### **Update Configuration**

```bash
# Edit nginx config
vi nginx.conf

# Update ConfigMap
kubectl delete configmap nginx-config
kubectl create configmap nginx-config --from-file=nginx.conf

# Restart nginx
kubectl rollout restart deployment nginx-loadbalancer
```

### **Rebuild Image**

```bash
# After code changes
docker build -t apollo-server-with-redis-apollo-server:latest .

# Delete old pods (they'll pull new image)
kubectl delete pods -l app=apollo
```

---

## 🛑 Stopping Everything

### **Stop Kubernetes**

```bash
# Delete all K8s resources
kubectl delete -f k8s/

# Verify nothing running
kubectl get all
```

### **Stop Docker Infrastructure**

```bash
# Stop Postgres + Redis
docker-compose down

# (Optional) Remove volumes (deletes data)
docker-compose down -v
```

---

## 🐛 Troubleshooting

### **Pods Not Starting**

```bash
# Check pod status
kubectl describe pod <pod-name>

# Common issues:
# - Image not found → Rebuild: docker build -t apollo-server-with-redis-apollo-server:latest .
# - Database connection failed → Check docker-compose is running
# - Pending status → Not enough resources
```

### **Can't Access localhost:30080**

```bash
# Check nginx service
kubectl get svc nginx-service

# Should show: 80:30080/TCP

# Check nginx pod is running
kubectl get pods -l app=nginx-lb

# Check nginx logs
kubectl logs -l app=nginx-lb
```

### **HPA Not Scaling**

```bash
# Check metrics-server
kubectl get deployment metrics-server -n kube-system

# If not installed:
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl patch deployment metrics-server -n kube-system --type='json' \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'

# Verify metrics
kubectl top pods
```

---

## 📚 Summary

**Request Flow:**

```
Client → localhost:30080
    → Nginx Service (NodePort)
        → Nginx Pod
            → Apollo Service (ClusterIP)
                → Apollo Pod 1, 2, 3... N
                    → host.docker.internal:5438 (Postgres)
                    → host.docker.internal:6379 (Redis)
```

**Key Commands:**

```bash
# Start
docker-compose up -d
docker build -t apollo-server-with-redis-apollo-server:latest .
kubectl apply -f k8s/

# Test
curl http://localhost:30080/graphql -d '{"query":"{userCount}"}'

# Monitor
kubectl get pods,svc,hpa
kubectl top pods

# Stop
kubectl delete -f k8s/
docker-compose down
```

🎉 **You're all set!**
