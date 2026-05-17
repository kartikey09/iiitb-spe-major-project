#!/usr/bin/env bash
# =============================================================================
# deploy.sh — One-shot deployment: Minikube + Kafka + App
# Usage:  chmod +x deploy.sh && ./deploy.sh
# =============================================================================
set -euo pipefail

NAMESPACE="judge-system"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$SCRIPT_DIR/k8s"

log()  { echo -e "\033[1;34m[DEPLOY]\033[0m $*"; }
ok()   { echo -e "\033[1;32m[  OK  ]\033[0m $*"; }
warn() { echo -e "\033[1;33m[ WARN ]\033[0m $*"; }
die()  { echo -e "\033[1;31m[ FAIL ]\033[0m $*"; exit 1; }

# ── 1. Start Minikube ─────────────────────────────────────────────────────────
log "Starting Minikube..."
if minikube status | grep -q "Running"; then
  ok "Minikube already running"
else
  minikube start \
    --cpus=4 \
    --memory=6144 \
    --disk-size=20g \
    --driver=docker \
    --container-runtime=docker \
    --kubernetes-version=stable
  ok "Minikube started"
fi

log "Enabling ingress addon..."
minikube addons enable ingress
ok "Ingress enabled"

log "Enabling metrics-server addon for HPA..."
minikube addons enable metrics-server
ok "Metrics server enabled"

# ── 2. Point Docker to Minikube ───────────────────────────────────────────────
log "Configuring Docker to use Minikube's daemon..."
eval "$(minikube docker-env)"
ok "Docker env set"

# ── 3. Build Images Inside Minikube ──────────────────────────────────────────
log "Building backend image..."
docker build -t judge-backend:latest "$SCRIPT_DIR/backend"
ok "judge-backend:latest built"

log "Building judge-worker image (this takes ~5 minutes on first run)..."
docker build -t judge-worker:latest "$SCRIPT_DIR/custom-judge"
ok "judge-worker:latest built"

log "Building frontend image..."
docker build -t judge-frontend:latest "$SCRIPT_DIR/frontend"
ok "judge-frontend:latest built"

# ── 4. Create Namespace ───────────────────────────────────────────────────────
log "Creating namespace $NAMESPACE..."
kubectl apply -f "$K8S_DIR/00-namespace.yaml"
ok "Namespace ready"

log "Deploying Secrets..."
kubectl apply -f "$K8S_DIR/00-secret.yaml"
ok "Secrets deployed"

# ── 5. Create Secret with SQL init scripts ─────────────────────────────────
log "Creating PostgreSQL init SQL Secret..."
kubectl create secret generic postgres-init-scripts \
  --from-file=1-schema.sql="$SCRIPT_DIR/01_schema.sql" \
  --from-file=2-seed.sql="$SCRIPT_DIR/02_seed_data.sql" \
  --namespace="$NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -
ok "SQL Secret applied"

# ── 6. Deploy PostgreSQL ──────────────────────────────────────────────────────
log "Deploying PostgreSQL..."
kubectl apply -f "$K8S_DIR/01-postgres.yaml"
log "Waiting for Postgres to be ready..."
kubectl rollout status deployment/postgres -n "$NAMESPACE" --timeout=120s
ok "PostgreSQL ready"

# ── 7. Deploy Kafka via Manifest (Apache official image) ─────────────────────
log "Deploying Kafka (KRaft mode, apache/kafka:3.9.0)..."
kubectl apply -f "$K8S_DIR/02-kafka.yaml"
log "Waiting for Kafka StatefulSet to be ready (may take 2-3 min)..."
kubectl rollout status statefulset/kafka -n "$NAMESPACE" --timeout=5m
ok "Kafka deployed"

# ── 8. Deploy Application Services ───────────────────────────────────────────
log "Deploying backend..."
kubectl apply -f "$K8S_DIR/02-backend.yaml"

log "Deploying judge-worker DaemonSet..."
kubectl apply -f "$K8S_DIR/03-judge-worker.yaml"

log "Deploying frontend..."
kubectl apply -f "$K8S_DIR/04-frontend.yaml"

log "Deploying ingress load balancer..."
kubectl apply -f "$K8S_DIR/05-ingress.yaml"

log "Deploying autoscalers (HPA)..."
kubectl apply -f "$K8S_DIR/07-hpa.yaml"

log "Waiting for backend rollout..."
kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=120s
ok "Backend ready"

log "Waiting for frontend rollout..."
kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=120s
ok "Frontend ready"

# ── 9. Print Access URLs ──────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
ok "All services deployed!"
echo ""
MINIKUBE_IP=$(minikube ip)
echo "  Ingress (Load Balancer): http://$MINIKUBE_IP"
echo "  Frontend NodePort:       http://$MINIKUBE_IP:30300"
echo ""
echo "  Or use:    minikube service frontend -n $NAMESPACE"
echo "═══════════════════════════════════════════════════════"
