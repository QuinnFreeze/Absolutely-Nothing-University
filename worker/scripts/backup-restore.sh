#!/usr/bin/env bash
# Private backups; never print Wrangler export logs (they can contain signed URLs).
set -euo pipefail
umask 077
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$WORKER_DIR"
WRANGLER="$WORKER_DIR/node_modules/.bin/wrangler"
DB_NAME="anu-campus-db"
BACKUP_DIR="${ANU_BACKUP_DIR:-${HOME}/.codex/backups/anu}"
ACTION="${1:-help}"
case "$ACTION" in
  backup)
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"
    OUT_FILE="$BACKUP_DIR/anu-campus-db-$(date -u +%Y%m%dT%H%M%SZ).sql"
    LOG_FILE="$(mktemp "${TMPDIR:-/tmp}/anu-backup.XXXXXX")"
    trap 'rm -f "$LOG_FILE"' EXIT
    if ! "$WRANGLER" d1 export "$DB_NAME" --config wrangler.toml --remote --output="$OUT_FILE" >"$LOG_FILE" 2>&1; then
      echo 'Backup failed. No database changes performed. Provider logs suppressed to protect signed URLs.' >&2
      exit 1
    fi
    test -s "$OUT_FILE"
    chmod 600 "$OUT_FILE"
    (cd "$BACKUP_DIR" && shasum -a 256 "$(basename "$OUT_FILE")" >"$(basename "$OUT_FILE").sha256")
    echo "Backup: $OUT_FILE"
    cat "$OUT_FILE.sha256"
    ;;
  restore-local)
    SQL_FILE="${2:-}"
    test -f "$SQL_FILE" && test -f "$SQL_FILE.sha256" || { echo 'SQL backup and checksum are required.' >&2; exit 1; }
    SQL_FILE="$(cd "$(dirname "$SQL_FILE")" && pwd)/$(basename "$SQL_FILE")"
    (cd "$(dirname "$SQL_FILE")" && shasum -a 256 -c "$SQL_FILE.sha256")
    # A fresh isolated emulator; never execute a dump over the production database.
    RESTORE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/anu-restore.XXXXXX")"
    "$WRANGLER" d1 execute anu-campus-db-local --config wrangler.dev.toml --local --persist-to "$RESTORE_DIR" --file "$SQL_FILE"
    echo "Isolated local restore: $RESTORE_DIR"
    ;;
  migrate-local)
    exec "$WRANGLER" d1 migrations apply anu-campus-db-local --config wrangler.dev.toml --local
    ;;
  migrate-prod)
    exec node scripts/release-gate.mjs migrate
    ;;
  restore)
    echo 'Remote in-place dump restore is disabled. Use restore-local for verification; review D1 Time Travel or a new database cutover for production recovery.' >&2
    exit 1
    ;;
  *) echo "Usage: $0 {backup|restore-local <absolute-backup.sql>|migrate-local|migrate-prod}"; exit 1 ;;
esac
