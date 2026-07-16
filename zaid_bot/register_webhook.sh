#!/bin/bash

CERT_FILE="./nginx/certs/server.crt"

if [ ! -f "$CERT_FILE" ]; then
    echo "Error: Certificate file not found at $CERT_FILE"
    echo "Please run ./start.sh first to generate it."
    exit 1
fi

echo "Telegram Webhook Registrar (Self-Signed SSL)"
echo "--------------------------------------------"

# Get Bot Token
echo "Enter your Telegram Bot Token:"
read -r BOT_TOKEN

if [ -z "$BOT_TOKEN" ]; then
    echo "Error: Bot Token is required."
    exit 1
fi

# Get Webhook URL
echo "Enter your n8n Webhook URL (from the Telegram Trigger node):"
echo "Example: https://bot.alhassan.life/webhook/123-abc"
read -r WEBHOOK_URL

if [ -z "$WEBHOOK_URL" ]; then
    echo "Error: Webhook URL is required."
    exit 1
fi

echo "Registering webhook..."

curl -F "url=$WEBHOOK_URL" \
     -F "certificate=@$CERT_FILE" \
     "https://api.telegram.org/bot$BOT_TOKEN/setWebhook"

echo
echo
echo "If the response above says 'ok': true, you are all set!"
