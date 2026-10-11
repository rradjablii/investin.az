#!/usr/bin/env bash
# Deletes ONLY the fictional demonstration records (property, listings, media, places, data source) from the local DB.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; . ./.env; set +a; fi
docker compose exec -T db psql -U "${POSTGRES_USER:-investin}" -d "${POSTGRES_DB:-investin}" <<'SQL'
BEGIN;
DELETE FROM inquiry WHERE listing_id IN (SELECT l.id FROM listing l JOIN data_source d ON d.id = l.data_source_id WHERE d.is_demo);
DELETE FROM listing WHERE data_source_id IN (SELECT id FROM data_source WHERE is_demo);
DELETE FROM property p WHERE NOT EXISTS (SELECT 1 FROM listing l WHERE l.property_id = p.id);
DELETE FROM place WHERE data_source_id IN (SELECT id FROM data_source WHERE is_demo);
DELETE FROM data_source WHERE is_demo;
COMMIT;
SQL
echo "Demonstration data removed."
