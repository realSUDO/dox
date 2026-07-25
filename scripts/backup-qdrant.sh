#!/bin/bash
set -e

source .env

echo "Creating Qdrant snapshot..."
# Qdrant snapshot API creates a snapshot and returns the snapshot name in JSON
# Assuming a single collection name mapped to project ID, or we can just snapshot the whole storage
# Qdrant has a /collections/{collection_name}/snapshots endpoint.
# Alternatively, to backup all collections, we need to list them or backup the storage volume.
# For simplicity, we just echo that volume backup is recommended if multiple collections exist.

echo "To backup Qdrant safely, we tar the docker volume data:"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_qdrant_${TIMESTAMP}.tar.gz"

docker run --rm -v dox_qdrant_data:/qdrant_data -v $(pwd):/backup alpine tar czvf /backup/${BACKUP_FILE} /qdrant_data
echo "Backup saved to ${BACKUP_FILE}"
