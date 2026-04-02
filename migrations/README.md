# Database Migrations

## Setup Database

### Menggunakan Supabase (Recommended)

1. **Login ke Supabase Dashboard** → pilih project kamu

2. **Buka SQL Editor** di sidebar

3. **Jalankan migrations secara berurutan:**

   **Step 1:** Migration tracking (jalankan sekali)
   ```sql
   -- Copy & paste isi file: 000_migration_tracking.sql
   ```

   **Step 2:** Setup tables (jalankan sekali)
   ```sql
   -- Copy & paste isi file: 001_initial_setup.sql
   -- Lalu jalankan:
   INSERT INTO schema_migrations (version) VALUES ('001_initial_setup');
   ```

   **Step 3:** Seed data (optional untuk dev)
   ```sql
   -- Copy & paste isi file: 002_seed_data.sql
   -- Lalu jalankan:
   INSERT INTO schema_migrations (version) VALUES ('002_seed_data');
   ```

4. **Setup Environment Variables**
   
   Di Supabase Dashboard → Settings → API
   
   Copy ke `.env`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key-here
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ADMIN_SECRET=your-secret-key
   ```

### Menggunakan PostgreSQL Lokal

```bash
# Buat database
createdb silent_reading_club

# Jalankan migrations
psql -U postgres -d silent_reading_club -f migrations/000_migration_tracking.sql
psql -U postgres -d silent_reading_club -f migrations/001_initial_setup.sql
psql -U postgres -d silent_reading_club -c "INSERT INTO schema_migrations (version) VALUES ('001_initial_setup');"
psql -U postgres -d silent_reading_club -f migrations/002_seed_data.sql
psql -U postgres -d silent_reading_club -c "INSERT INTO schema_migrations (version) VALUES ('002_seed_data');"
```

## Membuat Migration Baru

1. **Copy template:**
   ```bash
   cp migrations/_template.sql migrations/003_nama_migration.sql
   ```

2. **Edit file migration** dengan SQL changes kamu

3. **Jalankan di Supabase SQL Editor** atau `psql`:
   ```sql
   -- Isi migration kamu...
   
   -- Record migration
   INSERT INTO schema_migrations (version) VALUES ('003_nama_migration');
   ```

4. **Cek migration history:**
   ```sql
   SELECT * FROM schema_migrations ORDER BY applied_at DESC;
   ```

## Tips

- **Selalu gunakan `IF NOT EXISTS`** untuk idempotency
- **Nomor migrations** harus berurutan (001, 002, 003...)
- **Test di local** dulu sebelum apply ke production
- **Backup database** sebelum migration besar
- **Seed data (002)** opsional — skip di production

## Reset Data (Development Only)

```sql
TRUNCATE TABLE notes, books, members RESTART IDENTITY CASCADE;
-- Lalu jalankan ulang 002_seed_data.sql
```
