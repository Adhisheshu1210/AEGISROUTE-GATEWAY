# DEPLOYMENT GUIDE

This document provides production-ready deployment guides for AegisRoute, targeting scalable enterprise cloud environments on **Google Cloud Platform (GCP)**.

---

## 1. Local Container Stack: Docker Compose

For offline staging, local testing, or multi-service developer environments, we provide a unified `docker-compose.yml` that orchestrates the entire stack (FastAPI Backend, Streamlit Portal, and a local PostgreSQL database).

### Docker Compose Blueprint
The file is structured at `/backend/docker-compose.yml`:

```yaml
version: "3.8"

services:
  fastapi-backend:
    build: 
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - PORT=8000
    volumes:
      - .:/app
    depends_on:
      - postgres-db

  streamlit-frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8501:8501"
    entrypoint: ["streamlit", "run", "streamlit_app.py", "--server.port=8501", "--server.address=0.0.0.0"]
    depends_on:
      - fastapi-backend

  postgres-db:
    image: postgres:15-alpine
    container_name: aegisroute-db
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=aegis_admin
      - POSTGRES_PASSWORD=aegis_secure_password
      - POSTGRES_DB=aegisroute_dw
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Launching the Stack
1.  Navigate to the `/backend` folder:
    ```bash
    cd backend
    ```
2.  Set your environment variables and start the containers:
    ```bash
    export GEMINI_API_KEY="AIzaSy..."
    docker-compose up --build -d
    ```
3.  Monitor the logs to confirm the containers start successfully:
    ```bash
    docker-compose logs -f
    ```

---

## 2. Serverless API Deployment: Google Cloud Run

For the backend services API (without GPU-specific nodes) or the React frontend, **Google Cloud Run** provides a scalable serverless environment:

### Step 1: Package and Build Client Assets (Frontend)
Build the React production assets into static distributions:
```bash
npm run build
```
Cloud Run automatically serves the resulting static directory `/dist` via a built-in reverse proxy, minimizing container scaling times.

### Step 2: Build & Push Backend Container Image
Submit the backend container to Google Artifact Registry:
```bash
# Authenticate and set default project
gcloud auth login
gcloud config set project [YOUR_PROJECT_ID]

# Submit build to container registry
gcloud builds submit --tag gcr.io/[YOUR_PROJECT_ID]/aegisroute-backend:v1.0 ./backend
```

### Step 3: Deploy Backend Service to Cloud Run
Deploy the container, injecting environment variables and setting traffic policies:
```bash
gcloud run deploy aegisroute-backend-service \
  --image gcr.io/[YOUR_PROJECT_ID]/aegisroute-backend:v1.0 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=AIzaSy...,PORT=8000" \
  --port=8000 \
  --min-instances=1 \
  --max-instances=10 \
  --cpu=2 \
  --memory=4Gi
```

---

## 3. High-Performance GPU Ingestion: Google Kubernetes Engine (GKE)

To support the high-throughput **NVIDIA RAPIDS (cuDF)** telemetry processing engine, deploy AegisRoute onto **GKE Autopilot** (or a Standard GKE cluster) utilizing a dedicated **G2 machine-type node pool with NVIDIA L4 GPUs**.

### Step 1: Provision the L4 GPU Node Pool
Create a GPU-enabled node pool with autoscaling policies:
```bash
gcloud container node-pools create gpu-l4-pool \
  --cluster=aegisroute-production-cluster \
  --region=us-central1 \
  --machine-type=g2-standard-8 \
  --accelerator=type=nvidia-l4,count=1 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10 \
  --scopes=cloud-platform
```

### Step 2: Install NVIDIA CUDA Drivers
Deploy the official NVIDIA driver DaemonSet to mount kernel drivers to the pods:
```bash
kubectl apply -f https://raw.githubusercontent.com/GoogleCloudPlatform/container-engine-accelerators/master/nvidia-driver-installer/cos/daemonset-preloaded-latest.yaml
```

### Step 3: Deploy AegisRoute Kubernetes Manifests
Apply the complete configurations, including secrets, services, HPAs, and ingress routing.

#### 1. Secrets Configuration (`secrets.yaml`)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aegisroute-secrets
  namespace: logistics-intelligence
type: Opaque
stringData:
  gemini-api-key: "AIzaSy..." # Your Gemini API key
```

#### 2. GKE Pod Deployment Manifest (`deployment.yaml`)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aegisroute-gpu-ingestor
  namespace: logistics-intelligence
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aegisroute-ingestor
  template:
    metadata:
      labels:
        app: aegisroute-ingestor
    spec:
      containers:
      - name: rapids-cudf-container
        image: gcr.io/[YOUR_PROJECT_ID]/aegisroute-gpu:latest
        ports:
        - containerPort: 8000
        env:
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: aegisroute-secrets
              key: gemini-api-key
        resources:
          limits:
            nvidia.com/gpu: 1  # Binds 1x dedicated NVIDIA L4 GPU to each pod
            memory: 32Gi
            cpu: 8
          requests:
            nvidia.com/gpu: 1
            memory: 16Gi
            cpu: 4
```

#### 3. Service & Global HTTP Ingress Manifest (`ingress.yaml`)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: aegisroute-backend-srv
  namespace: logistics-intelligence
spec:
  ports:
  - port: 8000
    targetPort: 8000
  selector:
    app: aegisroute-ingestor
  type: NodePort

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: aegisroute-ingress
  namespace: logistics-intelligence
  annotations:
    kubernetes.io/ingress.class: "gce"
    ingress.gcp.kubernetes.io/ssl-redirect: "true"
spec:
  rules:
  - host: aegisroute.enterprise.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: aegisroute-backend-srv
            port:
              number: 8000
```

Apply all manifests using `kubectl`:
```bash
kubectl apply -f secrets.yaml
kubectl apply -f deployment.yaml
kubectl apply -f ingress.yaml
```
Your high-performance GPU logistics cluster is now live, secure, and routing global trade telemetry.
