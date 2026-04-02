#!/usr/bin/env bash
# ══════════════════════════════════════════════════
# SH-GROUP ERP — Database Backup Script
# Usage: DATABASE_URL="postgresql://..." bash scripts/db-backup.sh
# Output: backups/backup_YYYYMMDD_HHMM.sql.gz
# ══════════════════════════════════════════════════
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is not set."
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M")
FILENAME="backup_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

echo "🗄️  Starting backup..."
echo "   Timestamp : $TIMESTAMP (UTC)"
echo "   Output    : $FILEPATH"

# pg_dump with --no-owner --no-privileges for portability
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  | gzip > "$FILEPATH"

SIZE=$(du -h "$FILEPATH" | cut -f1)
echo "✅ Backup complete: $FILENAME ($SIZE)"

# ── Cleanup: remove backups older than RETENTION_DAYS ──
if [ -d "$BACKUP_DIR" ]; then
  DELETED=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -print -delete 2>/dev/null | wc -l)
  if [ "$DELETED" -gt 0 ]; then
    echo "🧹 Cleaned up $DELETED backup(s) older than ${RETENTION_DAYS} days."
  fi
fi

# ── Verify: list tables in dump ──
echo ""
echo "📋 Tables in backup:"
zcat "$FILEPATH" | grep -oP '(?<=CREATE TABLE )(public\.\w+)' | sort | while read -r tbl; do
  echo "   ✓ $tbl"
done

echo ""
echo "Done. File: $FILEPATH"
