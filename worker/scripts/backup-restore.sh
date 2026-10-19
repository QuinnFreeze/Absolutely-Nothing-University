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
# Resolve existing ancestors before mkdir. String-prefix checks confuse adjacent
# directory names and miss paths that enter the repository through symlinks.
external_backup_path() {
  node --input-type=module - "$1" "$WORKER_DIR/.." <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const [requested, repository] = process.argv.slice(2);
const root = fs.realpathSync.native(repository);
const within = (candidate) => {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
};
function canonicalTarget(raw) {
  // Keep traversal syntax until the OS resolves existing symlinks. Normalizing
  // "link/../" first can select a different directory from the filesystem.
  let cursor = path.isAbsolute(raw) ? raw : process.cwd() + path.sep + raw;
  const tail = [];
  while (true) {
    try { return path.resolve(fs.realpathSync.native(cursor), ...tail); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // A dangling existing symlink is not an ordinary nonexistent component.
      try { fs.lstatSync(cursor); throw new Error('Unresolvable existing path'); }
      catch (metadataError) { if (metadataError.code !== 'ENOENT') throw metadataError; }
      const parent = path.dirname(cursor);
      if (parent === cursor) throw error;
      tail.unshift(path.basename(cursor));
      cursor = parent;
    }
  }
}
try {
  const target = canonicalTarget(requested);
  if (within(path.resolve(requested)) || within(target)) throw new Error('Repository backup path');
  process.stdout.write(target);
} catch {
  console.error('Backup location must resolve outside the repository; unresolved symbolic links are refused.');
  process.exit(1);
}
NODE
}
case "$ACTION" in
  backup)
    # Validate before directory creation/chmod, then resolve again afterwards.
    BACKUP_DIR="$(external_backup_path "$BACKUP_DIR")"
    mkdir -p "$BACKUP_DIR"
    BACKUP_DIR="$(external_backup_path "$BACKUP_DIR")"
    chmod 700 "$BACKUP_DIR"
    OUT_FILE="$(external_backup_path "$BACKUP_DIR/anu-campus-db-$(date -u +%Y%m%dT%H%M%SZ).sql")"
    # The checksum sidecar must not redirect a write back into the repository.
    external_backup_path "$OUT_FILE.sha256" >/dev/null
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
    SQL_FILE="$(external_backup_path "$SQL_FILE")"
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
