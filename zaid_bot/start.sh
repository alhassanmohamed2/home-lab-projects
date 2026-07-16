#!/bin/bash

echo "n8n Auto-Launcher with Nginx & Self-Signed SSL (Linux)"

echo "[1/4] Checking SSL Certificates..."
CERT_DIR="./nginx/certs"
mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_DIR/server.crt" ] || [ ! -f "$CERT_DIR/server.key" ]; then
    echo "Generating self-signed certificate..."
    # Generate a self-signed certificate valid for 10 years
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "$CERT_DIR/server.key" \
        -out "$CERT_DIR/server.crt" \
        -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"
    echo "Certificate generated in $CERT_DIR"
else
    echo "Certificates found."
fi

echo "[2/4] Detecting Public IP..."
# Try to detect public IP for WEBHOOK_URL
PUBLIC_IP=$(curl -s ifconfig.me)
if [ -z "$PUBLIC_IP" ]; then
    echo "[WARNING] Could not detect Public IP. Defaulting to 'localhost'."
    echo "You may need to manually update WEBHOOK_URL in docker-compose.yml or export it before running this script."
    PUBLIC_IP="localhost"
fi

echo "Public IP detected: $PUBLIC_IP"
# Using Cloudflare Tunnel Domain
export WEBHOOK_URL="https://bot.alhassan.life/"

echo "[3/4] Starting Services..."
docker compose up -d

echo "Services started."
echo "WEBHOOK_URL set to: $WEBHOOK_URL"
echo "IMPORTANT: Ensure port 9574 is forwarded to this machine."

echo
echo "[4/4] Checking Local LLM Model (gemma:2b)..."
echo "Waiting for Ollama to be ready..."
sleep 5 # Give Ollama a moment to initialize
if docker compose exec ollama ollama list | grep -q "gemma:2b"; then
    echo "Model 'gemma:2b' is already present."
else
    echo "Model 'gemma:2b' not found. Pulling now (this may take a while)..."
    docker compose exec ollama ollama pull gemma:2b
fi

echo "Setup Complete!"
echo "Use './register_webhook.sh' to upload your certificate to Telegram."
