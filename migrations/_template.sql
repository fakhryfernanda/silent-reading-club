-- Template untuk migration baru
-- Copy file ini dan rename dengan nomor urut berikutnya
-- Contoh: 003_add_column_example.sql

-- Migration: [DESKRIPSI SINGKAT]
-- Created: [TANGGAL]

-- ========================================
-- UP Migration (apply changes)
-- ========================================

-- Contoh: Tambah kolom baru
-- ALTER TABLE books ADD COLUMN IF NOT EXISTS published_year INT;

-- Contoh: Create table baru
-- CREATE TABLE IF NOT EXISTS book_reviews (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   book_id UUID REFERENCES books(id),
--   review TEXT,
--   created_at TIMESTAMP DEFAULT NOW()
-- );

-- ========================================
-- Record migration
-- ========================================

-- INSERT INTO schema_migrations (version) VALUES ('XXX_nama_migration');

-- ========================================
-- DOWN Migration (rollback - optional, manual)
-- ========================================

-- Untuk rollback manual jika diperlukan:
-- ALTER TABLE books DROP COLUMN IF EXISTS published_year;
-- DROP TABLE IF EXISTS book_reviews;
-- DELETE FROM schema_migrations WHERE version = 'XXX_nama_migration';
