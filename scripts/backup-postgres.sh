#!/bin/bash
set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_postgres_${TIMESTAMP}.sql"

# Requires POSTGRES_USER and POSTGRES_DB to be exported in the shell running this
source .env

echo "Starting Postgres backup..."
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-dox} > "${BACKUP_FILE}"
echo "Backup saved to ${BACKUP_FILE}"
