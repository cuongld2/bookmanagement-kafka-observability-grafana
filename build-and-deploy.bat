@echo off
REM Build and Deploy Script for BookManagement App with Observability
REM This script builds Docker images and deploys to Minikube

echo ==========================================
echo Building BookManagement App with Observability
echo ==========================================
echo.

REM Check if minikube is running
echo Checking Minikube status...
minikube status >nul 2>&1
if errorlevel 1 (
    echo Minikube is not running. Starting minikube...
    minikube start --driver=docker
)

REM Use minikube's Docker daemon
echo Configuring Docker to use Minikube's daemon...
FOR /f "tokens=*" %%i IN ('minikube docker-env --shell cmd') DO @%%i

echo.
echo ==========================================
echo Step 1: Building Backend Image
echo ==========================================
cd backend

REM Install dependencies (including observability packages)
echo Installing backend dependencies...
call npm install

REM Build the backend image
echo Building backend Docker image...
docker build -t bookmanagement-backend:latest .

echo Backend image built successfully!
cd ..

echo.
echo ==========================================
echo Step 2: Building Frontend Image
echo ==========================================
cd frontend

REM Install dependencies (including Faro packages)
echo Installing frontend dependencies...
call npm install

REM Build the frontend image
echo Building frontend Docker image...
docker build -t bookmanagement-frontend:latest .

echo Frontend image built successfully!
cd ..

echo.
echo ==========================================
echo Step 3: Loading Images to Minikube
echo ==========================================

REM The images are already in minikube's Docker daemon since we used docker-env
echo Images are already available in Minikube's Docker daemon.
echo.
echo Verifying images...
docker images | findstr bookmanagement

echo.
echo ==========================================
echo Step 4: Deploying to Kubernetes
echo ==========================================

REM Apply configurations in order
echo Applying namespace...
kubectl apply -f k8s/namespace.yaml

echo Applying secrets and configmaps...
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml

echo Deploying database...
kubectl apply -f k8s/postgres-deployment.yaml

echo Waiting for database to be ready...
kubectl wait --for=condition=ready pod -l app=postgres -n bookmanagement --timeout=120s

echo Deploying Grafana Alloy...
kubectl apply -f k8s/grafana-alloy-config.yaml
kubectl apply -f k8s/grafana-alloy-deployment.yaml

echo Waiting for Alloy to be ready...
kubectl wait --for=condition=ready pod -l app=grafana-alloy -n bookmanagement --timeout=120s

echo Deploying backend...
kubectl apply -f k8s/backend-deployment.yaml

echo Waiting for backend to be ready...
kubectl wait --for=condition=ready pod -l app=backend -n bookmanagement --timeout=120s

echo Deploying frontend...
kubectl apply -f k8s/frontend-deployment.yaml

echo Waiting for frontend to be ready...
kubectl wait --for=condition=ready pod -l app=frontend -n bookmanagement --timeout=120s

echo.
echo ==========================================
echo Deployment Complete!
echo ==========================================
echo.
echo Services:
echo ---------
echo Frontend: http://frontend-service.bookmanagement.svc.cluster.local:3000
echo Backend:  http://backend-service.bookmanagement.svc.cluster.local:3001
echo.
echo To access the frontend, run:
echo   kubectl port-forward svc/frontend-service 3000:3000 -n bookmanagement
echo.
echo Then open: http://localhost:3000
echo.
echo Observability:
echo --------------
echo Grafana Cloud: https://ledinhcuong99.grafana.net
echo.
echo Check pod status:
echo   kubectl get pods -n bookmanagement
echo.
