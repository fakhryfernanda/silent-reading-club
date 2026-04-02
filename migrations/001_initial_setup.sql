-- Silent Reading Club - Database Setup
-- Migration: 001_initial_setup
-- Jalankan sekali untuk inisialisasi database

CREATE TABLE IF NOT EXISTS members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_phone     TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS books (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  author     TEXT,
  cover_url  TEXT,
  type       TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID REFERENCES members(id),
  book_id     UUID REFERENCES books(id),
  content     TEXT NOT NULL,
  raw_message TEXT,
  sort_order  INT,
  created_at  TIMESTAMP DEFAULT NOW()
);
