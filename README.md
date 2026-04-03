# Silent Reading Club

Website + bot WhatsApp untuk komunitas baca. Tag bot di WhatsApp, notes bacaan kamu langsung tersimpan dan tampil di website.

## Fitur

- 📝 **Simpan notes** — Tag bot di grup WA, catatan otomatis tersimpan
- 📚 **Lihat bacaan** — Semua notes terkumpul per buku di website
- 👥 **Multi-reader** — Lihat catatan dari berbagai pembaca untuk buku yang sama
- 🔍 **Filter** — Filter buku by tipe (Fiksi, Nonfiksi, dll) dan by pembaca
- 🎨 **Markdown support** — Format notes dengan markdown (bold, italic, list, dll)

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd silent-reading-club
npm install
```

### 2. Setup Database

Buat project di [Supabase](https://supabase.com):

1. **Login ke Supabase** → Create new project
2. **Buka SQL Editor** → Run migrations dari folder `migrations/`:
   - `000_migration_tracking.sql`
   - `001_initial_setup.sql`
   - `002_seed_data.sql` (optional, untuk dev)

Lihat `migrations/README.md` untuk detail lengkap.

### 3. Environment Variables

Copy `.env.example` ke `.env` dan sesuaikan:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key-here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ADMIN_SECRET=your-secret-key
```

Dapatkan Supabase URL dan Publishable Key dari: Dashboard → Settings → API

### 4. Run Development Server

```bash
npm run dev
```

Website buka di [http://localhost:3000](http://localhost:3000)

## Cara Pakai

### Website

- **Homepage** — Lihat semua buku dan notes terbaru
  - **Filter by tipe** — Fiksi, Nonfiksi, Komik, Artikel, Jurnal, Kitab Suci
  - **Filter by pembaca** — Tampilkan hanya buku yang dibaca orang tertentu
  - Filter tersimpan di URL — bisa di-share/bookmark
- **Detail Buku** — Klik buku untuk lihat semua catatan
  - **Filter pembaca** — Lihat catatan dari pembaca tertentu
- **Admin Panel** — Buka `/admin?key=YOUR_SECRET` untuk CRUD data
  - Tab Buku: filter by tipe dan pembaca
  - Tab Catatan: filter by pembaca dan buku

### WhatsApp Bot

Tag bot di grup WhatsApp dengan format bebas:

```
@bot tadi baca Atomic Habits bagian habit stacking.

Habit stacking itu mind-blowing — tumpuk kebiasaan baru 
di atas yang lama yang sudah ada.
```

Bot (via n8n + Claude) akan otomatis ekstrak:
- Nama pengirim
- Judul buku
- Isi catatan

Dan langsung simpan ke database.

> **Note:** Setup n8n + WhatsApp integration ada di file `n8n-workflow.json`. Import ke n8n instance kamu.

## Tech Stack

- **Next.js 14** — Frontend + API
- **Supabase** — Database (PostgreSQL)
- **n8n** — WhatsApp automation
- **Claude AI** — Parse pesan WA

## Admin Panel

Akses di `/admin?key=YOUR_ADMIN_SECRET`

Fitur:
- ✏️ CRUD anggota, buku, dan catatan
- 📝 Edit markdown dengan live preview
- 🗑️ Hapus data (cascade delete)
- 📊 Lihat semua data sekaligus
- 🔍 **Filter**:
  - Tab Buku: by tipe dan pembaca
  - Tab Catatan: by pembaca dan buku (dropdown alfabetis)

## Development Notes

- Menggunakan Supabase Client SDK (bukan raw SQL/Prisma)
- Tidak pakai Tailwind — inline styles + CSS variables
- Markdown rendering dengan `react-markdown`
- Database setup terpisah di folder `migrations/`

Detail lengkap untuk AI agent ada di `CLAUDE.md`.

## License

MIT
