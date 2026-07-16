#!/bin/bash

# Wait briefly to ensure logs are updated
sleep 5

# Extract the latest Cloudflare tunnel URL
URL=$(journalctl -u cloudflared-quick-tunnel --no-pager | grep "trycloudflare.com" | grep "INF" | sed -n 's/.*INF |  \(https:\/\/[a-zA-Z0-9-]*\.trycloudflare\.com\).*/\1/p' | tail -1)

# Check if URL is empty
if [ -z "$URL" ]; then
  echo "No tunnel URL found in logs" >&2
  exit 1
fi

# Send email with the URL
python3 /home/alhassan/alhassanTests/send_email.py "Cloudflare Tunnel URL Update" "$URL"
