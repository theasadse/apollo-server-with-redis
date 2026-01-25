Quick Kubernetes setup notes

1. Build the Docker image locally

docker build -t apollo-server-with-redis-apollo-server:latest .

2. Apply manifests

kubectl apply -f k8s/apollo-deployment.yaml
kubectl apply -f k8s/apollo-service.yaml
kubectl apply -f k8s/nginx-configmap.yaml
kubectl apply -f k8s/nginx-deployment.yaml
kubectl apply -f k8s/nginx-service.yaml

3. Access

- Nginx is exposed via NodePort 30080: http://localhost:30080/graphql
- Load balancer status page: http://localhost:30080/lb-status
- Health check: http://localhost:30080/health

4. Database & Redis

- Current manifests use host.docker.internal for Postgres (port 5438) and Redis (6379).
- Postgres and Redis are running as Docker containers (not in Kubernetes).
- Apollo pods connect to them via host.docker.internal.

5. Verify deployment

kubectl get pods,svc
kubectl logs -l app=apollo
kubectl logs -l app=nginx-lb

6. Rolling updates

- Scale replicas: kubectl scale deployment apollo --replicas=5
- Update image: kubectl set image deployment/apollo apollo=<image>:<tag>
- Restart pods: kubectl rollout restart deployment apollo

7. Cleanup

kubectl delete -f k8s/
