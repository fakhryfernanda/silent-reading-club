-- Add cover_r2_key and cover_url_expires_at to books table
-- cover_url stores the signed URL, cover_r2_key stores the R2 object key for refresh
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS cover_r2_key TEXT,
  ADD COLUMN IF NOT EXISTS cover_url_expires_at TIMESTAMP;
