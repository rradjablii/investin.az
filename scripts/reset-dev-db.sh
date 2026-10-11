#!/usr/bin/env bash
# Wipes the local development database (and uploaded files) and lets Flyway rebuild it on next backend start.
# DESTROYS ALL LOCAL DATA. Never run against a shared or production database.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; . ./.env; set +a; fi
docker compose exec -T db psql -U "${POSTGRES_USER:-investin}" -d "${POSTGRES_DB:-investin}" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
rm -rf backend/data/uploads
echo "Database wiped. Start the backend to re-run migrations (and the demo seed under the 'dev' profile)."
