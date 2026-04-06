-- Migration: Add alias column to members table with UNIQUE constraint
-- Created: 2026-04-06

-- ========================================
-- UP Migration (apply changes)
-- ========================================

ALTER TABLE members ADD COLUMN IF NOT EXISTS alias TEXT;

-- First, set empty strings to NULL so we don't get constraint conflicts
UPDATE members SET alias = NULL WHERE alias = '';

-- Create a partial unique index: only non-null alias values must be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_alias_unique ON members (alias) WHERE alias IS NOT NULL;

-- ========================================
-- Record migration
-- ========================================

INSERT INTO schema_migrations (version) VALUES ('005_add_member_alias');

-- ========================================
-- DOWN Migration (rollback - optional, manual)
-- ========================================

-- DROP INDEX IF EXISTS idx_members_alias_unique;
-- ALTER TABLE members DROP COLUMN IF EXISTS alias;
-- DELETE FROM schema_migrations WHERE version = '005_add_member_alias';
