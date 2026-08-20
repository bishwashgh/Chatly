-- Story file name (e.g. music track name)
ALTER TABLE stories ADD COLUMN IF NOT EXISTS file_name TEXT;