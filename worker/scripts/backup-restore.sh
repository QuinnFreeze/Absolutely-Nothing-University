#!/usr/bin/env bash
# ============================================================================
# ANU (Absolutely Nothing University) · Cloudflare D1 Backup & Restore Script
# Usage:
#   ./worker/scripts/backup-restore.sh backup          # Export remote D1 to timestamped SQL
#   ./worker/scripts/backup-restore.sh restore <file>  # Restore SQL dump to remote D1
#   ./worker/scripts/backup-restore.sh migrate-local   # Apply migrations to local D1
#   ./worker/scripts/backup-restore.sh migrate-prod    # Apply migrations to remote D1
# ============================================================================
set -euo pipefail

DB_NAME="${D1_DB_NAME:-anu-campus-db}"
BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"
mkdir -p "$BACKUP_DIR"

ACTION="${1:-help}"

case "$ACTION" in
  backup)
    TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
    OUT_FILE="${BACKUP_DIR}/${DB_NAME}-${TIMESTAMP}.sql"
    echo "[ANU D1] Exporting remote D1 database '${DB_NAME}' to ${OUT_FILE}..."
    npx wrangler d1 export "$DB_NAME" --remote --output="$OUT_FILE"
    shasum -a 256 "$OUT_FILE" > "${OUT_FILE}.sha256"
    echo "[ANU D1] Backup complete: ${OUT_FILE}"
    echo "[ANU D1] SHA-256 checksum saved to: ${OUT_FILE}.sha256"
    ;;
  restore)
    SQL_FILE="${2:-}"
    if [[ -z "$SQL_FILE" || ! -f "$SQL_FILE" ]]; then
      echo "Error: Please specify a valid backup .sql file to restore." >&2
      exit 1
    fi
    if [[ -f "${SQL_FILE}.sha256" ]]; then
      echo "[ANU D1] Verifying SHA-256 integrity checksum..."
      shasum -a 256 -c "${SQL_FILE}.sha256"
    fi
    echo "[ANU D1] Restoring ${SQL_FILE} into remote D1 database '${DB_NAME}'..."
    npx wrangler d1 execute "$DB_NAME" --remote --file="$SQL_FILE"
    echo "[ANU D1] Restore completed successfully."
    ;;
  migrate-local)
    echo "[ANU D1] Applying migrations to local D1 database '${DB_NAME}'..."
    npx wrangler d1 migrations apply "$DB_NAME" --local
    ;;
  migrate-prod)
    echo "[ANU D1] Applying migrations to production D1 database '${DB_NAME}'..."
    npx wrangler d1 migrations apply "$DB_NAME" --remote
    ;;
  *)
    echo "Usage: $0 {backup|restore <backup.sql>|migrate-local|migrate-prod}"
    exit 1
    ;;
esac
