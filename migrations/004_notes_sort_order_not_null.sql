-- Migration: Notes sort_order NOT NULL dengan auto-backfill
-- Created: 2026-04-05
--
-- Tujuan:
-- 1. Backfill sort_order untuk catatan existing (berdasarkan created_at per book)
-- 2. Enforce sort_order NOT NULL dan sequential

-- ========================================
-- UP Migration
-- ========================================

-- Step 1: Backfill NULL sort_order dengan sequential numbers
-- Assign berdasarkan created_at (paling lama = 1) per book_id
WITH ranked_notes AS (
  SELECT 
    id,
    book_id,
    ROW_NUMBER() OVER (PARTITION BY book_id ORDER BY created_at ASC) as new_sort_order
  FROM notes
  WHERE sort_order IS NULL
)
UPDATE notes n
SET sort_order = rn.new_sort_order
FROM ranked_notes rn
WHERE n.id = rn.id;

-- Step 2: Verify tidak ada yang NULL (untuk safety)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM notes WHERE sort_order IS NULL) THEN
    RAISE EXCEPTION 'Migration failed: Masih ada notes dengan sort_order NULL setelah backfill';
  END IF;
END $$;

-- Step 3: Enforce NOT NULL constraint
ALTER TABLE notes 
  ALTER COLUMN sort_order SET NOT NULL;

-- Step 4: Tambah constraint untuk pastikan sequential > 0
ALTER TABLE notes
  ADD CONSTRAINT notes_sort_order_positive CHECK (sort_order > 0);

-- ========================================
-- Record migration
-- ========================================

INSERT INTO schema_migrations (version) VALUES ('004_notes_sort_order_not_null');

-- ========================================
-- DOWN Migration (manual rollback)
-- ========================================

-- Untuk rollback:
-- 1. Hapus constraint:
--    ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_sort_order_positive;
-- 2. Allow NULL lagi:
--    ALTER TABLE notes ALTER COLUMN sort_order DROP NOT NULL;
-- 3. Hapus dari tracking:
--    DELETE FROM schema_migrations WHERE version = '004_notes_sort_order_not_null';
