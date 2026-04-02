-- Migration tracking table
-- Jalankan ini PERTAMA KALI untuk tracking migrations

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial migration record (jika setup sudah dijalankan manual)
-- INSERT INTO schema_migrations (version) VALUES ('001_initial_setup');
-- INSERT INTO schema_migrations (version) VALUES ('002_seed_data');
