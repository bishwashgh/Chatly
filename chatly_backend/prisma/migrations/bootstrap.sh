#!/bin/sh
# Baseline Prisma migrations on an existing database (e.g. created earlier by
# `prisma db push`) and then apply any pending migrations.
#
# This script runs BEFORE the app starts on every deploy. It is idempotent —
# safe to run repeatedly.
#
# How it works:
#   1. Drop any rogue `prisma_migrations` table (without underscore) left by
#      earlier broken bootstrap attempts — Prisma 5.x uses `_prisma_migrations`.
#   2. If `_prisma_migrations` doesn't exist or has no record for 001_initial,
#      and the schema is non-empty, baseline with `prisma migrate resolve`.
#   3. Run `npx prisma migrate deploy` to apply any pending migrations.

set -e

export DATABASE_URL=${DATABASE_URL:?DATABASE_URL is not set}
export PRISMA_HIDE_UPDATE_MESSAGE=1

run_psql() {
  psql "$DATABASE_URL" -tAq -c "$1"
}

# ── Step 0: Clean up rogue table from previous broken deploys ──
# A previous bootstrap.sh mistakenly created/checked for "prisma_migrations"
# (without underscore). Drop it if it exists — Prisma 5 uses "_prisma_migrations".
ROGUE_TABLE_EXISTS=$(run_psql "SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'prisma_migrations'
);")

if [ "$ROGUE_TABLE_EXISTS" = "t" ]; then
  echo "Dropping rogue 'prisma_migrations' table (Prisma 5 uses '_prisma_migrations')..."
  run_psql "DROP TABLE IF EXISTS prisma_migrations;"
fi

# ── Step 1: Check the REAL Prisma migration table ──
MIGRATIONS_TABLE_EXISTS=$(run_psql "SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
);")

if [ "$MIGRATIONS_TABLE_EXISTS" != "t" ]; then
  echo "_prisma_migrations table not found — checking if the schema is already populated..."

  SCHEMA_OBJECT_COUNT=$(run_psql "SELECT count(*) FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'S');")

  if [ "$SCHEMA_OBJECT_COUNT" -gt 0 ]; then
    echo "Schema is non-empty ($SCHEMA_OBJECT_COUNT tables/sequences) — baselining migration history..."
    npx prisma migrate resolve --applied 001_initial
  else
    echo "Schema is empty — fresh database, migrate deploy will create everything."
  fi
else
  echo "_prisma_migrations table exists — checking if 001_initial is recorded..."

  INITIAL_RECORDED=$(run_psql "SELECT EXISTS (
    SELECT 1 FROM \"_prisma_migrations\"
    WHERE migration_name = '001_initial'
  );")

  if [ "$INITIAL_RECORDED" != "t" ]; then
    echo "001_initial not found in _prisma_migrations — baselining..."
    npx prisma migrate resolve --applied 001_initial
  else
    echo "001_initial already recorded — baseline not needed."
  fi
fi

# ── Step 2: Apply pending migrations ──
exec npx prisma migrate deploy
