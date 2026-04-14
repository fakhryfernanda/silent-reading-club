# Silent Reading Insights

Website + bot WhatsApp untuk komunitas baca. Tag bot di WhatsApp, notes bacaan kamu langsung tersimpan dan tampil di website.

## Fitur

- 📝 **Simpan notes** — Tag bot di grup WA, catatan otomatis tersimpan
- 📚 **Lihat bacaan** — Semua notes terkumpul per buku di website
- 👥 **Multi-reader** — Lihat catatan dari berbagai pembaca untuk buku yang sama
- 🎭 **Alias pembaca** — Tampilkan nama samaran (alias) di halaman publik, fallback ke nama asli kalau alias kosong
- 📖 **Collapse notes** — Notes panjang auto-truncate, klik "Baca selengkapnya" untuk expand
- 🔍 **Filter** — Filter buku by tipe (Fiksi, Nonfiksi, dll), by pembaca, dan pencarian judul (live search)
- 📄 **Pagination** — 6 buku per halaman (desktop) / 4 (mobile), navigasi client-side
- 🎨 **Markdown support** — Format notes dengan markdown (bold, italic, list, dll)
- 🖼️ **Attachment foto** — Upload foto ke catatan via admin panel, tampil di halaman detail buku
- 🔍 **Image carousel** — Klik attachment untuk buka modal fullscreen dengan navigasi (geser/arrow/keyboard), zoom (+/-/scroll/double-click), dan panning (drag saat zoom)
- 📕 **Cover buku** — Upload cover buku via admin panel, tampil di homepage dan halaman detail
- 📚 **Searchable book dropdown** — Pilih buku di admin dengan search, filter "Lanjut baca" / "Buku baru"
- 🔢 **Urutan catatan** — Sort order sequential (required), auto-reorder saat insert/edit/hapus catatan

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
   - `003_attachments.sql`
   - `004_notes_sort_order_not_null.sql`
   - `005_add_member_alias.sql` (tambah kolom `alias` dengan constraint UNIQUE)

Lihat `migrations/README.md` untuk detail lengkap.

### 3. Environment Variables

Copy `.env.example` ke `.env` dan sesuaikan:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key-here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ADMIN_SECRET=your-secret-key

# Cloudflare R2 (untuk attachment foto)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
```

Dapatkan Supabase URL dan Publishable Key dari: Dashboard → Settings → API

### 4. Run Development Server

```bash
npm run dev
```

Website buka di [http://localhost:3000](http://localhost:3000)

## Cara Pakai

### Website

- **Homepage** — Lihat semua buku dan notes terbaru (pagination: 6 buku per halaman desktop, 4 di mobile)
  - Header: "Silent Reading Insights" + subtitle "Mengubah literasi menjadi inspirasi"
  - **Filter by tipe** — Fiksi, Nonfiksi, Komik, Artikel, Jurnal, Kitab Suci
  - **Filter by pembaca** — Tampilkan hanya buku yang dibaca orang tertentu
  - **Pencarian judul** — Live search, per-word matching
  - **Layout filter**: baris atas = judul (kiri) + pembaca (kanan), baris bawah = tipe chips
  - Filter tersimpan di URL — bisa di-share/bookmark
  - **Pagination** — Client-side, tombol "Sebelumnya" / "Selanjutnya" + tombol nomor halaman (lingkaran)
- **Detail Buku** — Klik buku untuk lihat semua catatan
  - **Filter pembaca** — Lihat catatan dari pembaca tertentu
  - **Collapse/Expand** — Notes >300 karakter auto-truncate, tombol "Baca selengkapnya ▼" / "Tutup ▲"
  - **Attachment foto** — Thumbnail foto di bawah konten catatan, klik untuk buka carousel fullscreen
  - **Image Carousel** — Modal fullscreen dengan navigasi panah/swipe, zoom (scroll wheel / tombol +-/double-click), panning (drag saat zoom), keyboard (←→ navigasi, +/- zoom, Esc tutup), gambar portrait memaksimalkan tinggi (90vh), landscape memaksimalkan lebar (90vw)
  - **Cover buku** — Tampil di hero section halaman detail dan sebagai aksen di card homepage
- **Admin Panel** — Buka `/admin?key=YOUR_SECRET` untuk CRUD data
  - Tab Buku: filter by tipe, pembaca, dan pencarian judul (live search)
  - Tab Catatan: filter by pembaca, buku, dan pencarian judul buku (live search)

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
- **Cloudflare R2** — Penyimpanan foto attachment (S3-compatible)
- **n8n** — WhatsApp automation
- **Claude AI** — Parse pesan WA

## Admin Panel

Akses di `/admin?key=YOUR_ADMIN_SECRET`

Fitur:
- ✏️ CRUD anggota, buku, dan catatan
- 📝 Edit markdown dengan live preview
- 🗑️ Hapus data (cascade delete)
- 📊 Lihat semua data sekaligus
- 🖼️ **Upload foto** per catatan (multiple, langsung ke Cloudflare R2)
- 📕 **Upload cover buku** — upload saat tambah/edit buku, cover lama otomatis dihapus dari R2
- 📚 **Searchable book dropdown** — Pilih buku saat tambah catatan dengan search, filter "Lanjut baca" (buku yang sudah dibaca user) atau "Buku baru"
- 🔢 **Urutan catatan** — Sort order required (default: auto-increment). Edit urutan auto-reorder catatan lain dalam buku yang sama (naik/turun/hapus)
- 🎭 **Alias anggota** — Atur nama samaran (alias) unik per anggota, tampil di publik menggantikan nama asli
- 🔍 **Filter**:
  - Tab Buku: by tipe, pembaca, dan pencarian judul (live search)
  - Tab Catatan: by pembaca, buku, dan pencarian judul buku (live search, dropdown alfabetis)

## Development Notes

- Menggunakan Supabase Client SDK (bukan raw SQL/Prisma)
- **Tailwind CSS v3** — Styling dengan design tokens kustom (warna amber, serif font), @tailwindcss/typography untuk markdown rendering
- Markdown rendering dengan `react-markdown`
- Database setup terpisah di folder `migrations/`
- Foto attachment dan cover buku disimpan di Cloudflare R2 dengan signed URL (expiry 7 hari, auto-refresh)

### UI Features

- 🎨 **Font size control** — Atur ukuran teks di halaman detail buku untuk kenyamanan membaca
- 📖 **Dynamic page title** — Judul halaman otomatis mengikuti judul buku yang sedang dilihat
- 🖼️ **Cover mode toggle** — Ganti tampilan kartu buku antara mode cover (gambar) dan mode info (detail)
- 📐 **CSS flexbox layout** — Tinggi kartu buku seragam menggunakan pure CSS, tanpa JS measurement
- 🎯 **Bold headers** — Header tebal untuk visual hierarchy yang lebih baik
- 📱 **Responsive design** — Layout adaptif untuk mobile dan desktop dengan Tailwind utilities

Detail lengkap untuk AI agent ada di `CLAUDE.md`.

## License

MIT
