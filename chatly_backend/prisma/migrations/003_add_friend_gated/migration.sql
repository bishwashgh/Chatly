-- AlterTable
-- Defaults to false so enabling the setting is an explicit user choice and no
-- existing account silently starts rejecting messages from non-friends.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "friendGated" BOOLEAN NOT NULL DEFAULT false;
