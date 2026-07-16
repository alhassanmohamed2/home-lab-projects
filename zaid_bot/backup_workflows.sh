#!/bin/bash

# Configuration
BACKUP_DIR="./data/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
TARGET_DIR="$BACKUP_DIR/$TIMESTAMP"

# Create backup directory on host (which maps to /home/node/.n8n-files/backups inside container)
mkdir -p "$TARGET_DIR"
chmod -R 777 "$TARGET_DIR"

echo "Starting n8n backup to $TARGET_DIR..."

# 1. Export Workflows (JSON)
# We access the internal path /home/node/.n8n-files which is mapped to ./data
docker exec n8n n8n export:workflow --all --output=/home/node/.n8n-files/backups/$TIMESTAMP/workflows.json

# 2. Export Credentials (Encrypted - Safe for storage, requires same encryption key to restore)
docker exec n8n n8n export:credentials --all --output=/home/node/.n8n-files/backups/$TIMESTAMP/credentials.json

# 3. (Optional) Binary Backup of SQLite Database
# We copy the actual database file as a failsafe
docker cp n8n:/home/node/.n8n/database.sqlite "$TARGET_DIR/database.sqlite"

echo "------------------------------------------------"
echo "Backup Completed Successfully!"
echo "Location: $TARGET_DIR"
echo "Contents:"
ls -lh "$TARGET_DIR"
echo "------------------------------------------------"
