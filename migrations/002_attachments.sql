CREATE TABLE IF NOT EXISTS attachments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id        UUID REFERENCES notes(id) ON DELETE CASCADE,
  r2_key         TEXT NOT NULL,
  file_name      TEXT,
  mime_type      TEXT,
  signed_url     TEXT,
  url_expires_at TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW()
);
