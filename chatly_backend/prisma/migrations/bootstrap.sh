#!/bin/sh
# Bootstrap Prisma migrations on an existing database that was created
# by `prisma db push` (no prisma_migrations table).
#
# This script runs BEFORE `prisma migrate deploy` on every deploy.
# It is safe to run repeatedly — all operations are idempotent.
#
# How it works:
#   1. If the prisma_migrations table does not exist, create it.
#   2. If the 001_initial migration row is missing, insert it with the
#      correct checksum so Prisma considers it already applied.
#   3. Run `npx prisma migrate deploy` to apply any NEW migrations.
#
# After the first successful deploy, steps 1-2 become no-ops and only
# step 3 runs (applying new migrations as you add them).

set -e

export DATABASE_URL=${DATABASE_URL:?DATABASE_URL is not set}
export INITIAL_MIGRATION_CHECKSUM=${INITIAL_MIGRATION_CHECKSUM:?INITIAL_MIGRATION_CHECKSUM is not set}

# --- 1. Create prisma_migrations table if it doesn't exist ---
psql "$DATABASE_URL" -q <<'SQL'
CREATE TABLE IF NOT EXISTS "prisma_migrations" (
    "id" SERIAL PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "finished_at" TIMESTAMP(3),
    "migration_name" TEXT NOT NULL,
    "logs" TEXT[],
    "rolled_back_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);
SQL

# --- 2. Mark the initial migration as applied (if not already) ---
psql "$DATABASE_URL" -q <<SQL
INSERT INTO "prisma_migrations" ("checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
SELECT
    '${INITIAL_MIGRATION_CHECKSUM}',
    CURRENT_TIMESTAMP,
    '001_initial',
    CURRENT_TIMESTAMP,
    1
WHERE NOT EXISTS (
    SELECT 1 FROM "prisma_migrations" WHERE "migration_name" = '001_initial'
);
SQL

# --- 3. Apply any pending migrations (including future ones) ---
exec npx prisma migrate deploy
