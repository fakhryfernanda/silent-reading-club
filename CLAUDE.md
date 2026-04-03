# CLAUDE.md — Silent Reading Club

Dokumen ini berisi konteks lengkap project untuk AI agent. Baca seluruhnya sebelum membantu.

---

## Gambaran Project

**Silent Reading Club** adalah website + bot WhatsApp untuk komunitas baca internal. Anggota grup WA bisa tag bot untuk menyimpan notes bacaan mereka, dan notes tersebut otomatis muncul di website.

**Masalah yang diselesaikan:**
- Chat dan diskusi di WA gampang tenggelam dan terlupakan
- Notes bacaan tidak terorganisir
- Tidak ada arsip yang mudah dicari

**Prinsip utama:**
- Sesimpel mungkin — tidak ada login, tidak ada akun
- WA sebagai satu-satunya input
- Website read-only

---

## Alur Kerja

```
Anggota tag @bot di grup WA
        ↓
n8n menangkap pesan
        ↓
Claude (via n8n) mengekstrak:
  - Nama pengirim (dari WA)
  - Judul buku
  - Isi notes
        ↓
POST /api/notes (Next.js API)
        ↓
Disimpan ke PostgreSQL
        ↓
Tampil di website
```

---

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Website + API | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| DB client | `@supabase/supabase-js` |
| Otomasi WA | n8n (self-hosted di VPS) |
| AI parsing | Claude via n8n |
| Hosting | VPS (n8n + Next.js) |

> **Catatan:** Project menggunakan Supabase untuk database PostgreSQL dengan Supabase Client SDK.

---

## Struktur Project

```
silent-reading-club/
├── .gitignore
├── .env.example
├── next.config.js                   ← transpilePackages: ['react-markdown']
├── next-env.d.ts
├── package.json
├── tsconfig.json
├── migrations/
│   ├── README.md                    ← Instruksi setup database & seed
│   ├── setup.sql                    ← SQL untuk buat tabel
│   └── seed.sql                     ← Data dummy
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css              ← CSS variables + .note-content (markdown styling)
    │   ├── page.tsx                 ← Homepage (Server Component)
    │   ├── admin/
    │   │   └── page.tsx             ← Halaman admin (Client Component, protected by ADMIN_SECRET)
    │   ├── books/
    │   │   └── [id]/
    │   │       └── page.tsx         ← Detail buku (Client Component, render markdown)
    │   └── api/
    │       ├── books/
    │       │   ├── route.ts         ← GET semua buku + stats
    │       │   └── [id]/
    │       │       └── route.ts     ← GET detail buku + notes
    │       ├── notes/
    │       │   └── route.ts         ← POST note baru (dipanggil n8n)
    │       └── admin/
    │           ├── data/
    │           │   └── route.ts     ← GET semua data admin sekaligus
    │           ├── members/
    │           │   ├── route.ts     ← POST member baru
    │           │   └── [id]/
    │           │       └── route.ts ← PATCH (nama + nomor WA) + DELETE member
    │           ├── books/
    │           │   ├── route.ts     ← POST buku baru
    │           │   └── [id]/
    │           │       └── route.ts ← PATCH (judul + penulis) + DELETE buku
    │           └── notes/
    │               ├── route.ts     ← POST catatan manual
    │               └── [id]/
    │                   └── route.ts ← PATCH (konten) + DELETE catatan
    ├── components/
    │   ├── BookGrid.tsx             ← Grid buku (Client Component, preview plain text)
    │   └── BookFilters.tsx          ← Filter UI reusable (type chips + reader dropdown)
    └── lib/
        ├── db.ts                    ← Supabase client (singleton)
        ├── types.ts                 ← TypeScript types
        └── utils.ts                 ← timeAgo, avatarColor, initials, stripMarkdown
```

---

## Database Schema

> **Setup:** Lihat `migrations/README.md` untuk instruksi lengkap setup database dan seed data.

```sql
-- Anggota grup WA
CREATE TABLE members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_phone     TEXT UNIQUE NOT NULL,   -- identifier utama
  display_name TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Buku yang dibaca (juga komik, artikel, jurnal, kitab suci, dll)
CREATE TABLE books (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  author     TEXT,
  cover_url  TEXT,                     -- opsional, bisa di-fetch dari Google Books
  type       TEXT,                     -- nullable: 'Fiksi', 'Nonfiksi', 'Komik', 'Artikel', 'Jurnal', 'Kitab Suci'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notes per anggota per buku
CREATE TABLE notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID REFERENCES members(id),
  book_id     UUID REFERENCES books(id),
  content     TEXT NOT NULL,           -- hasil ekstraksi Claude (markdown)
  raw_message TEXT,                    -- pesan asli dari WA (backup)
  sort_order  INT,                     -- urutan tampil per buku (1, 2, 3...), bisa diubah di admin
  created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### `GET /api/books`
Mengembalikan semua buku beserta stats (jumlah pembaca, jumlah notes, preview notes terbaru, daftar readers).

**Query params (opsional):**
- `type` — Filter by tipe buku (e.g., `?type=Fiksi`)
- `readerId` — Filter by pembaca (e.g., `?readerId=uuid`)
- `title` — Filter by judul buku (live search, per-word matching, e.g., `?title=atomic+habits`)
- Bisa dikombinasikan: `?type=Nonfiksi&readerId=uuid&title=atomic`

### `GET /api/books/:id`
Mengembalikan detail satu buku beserta semua notes-nya (dengan info member).

### `POST /api/notes`
Endpoint untuk n8n. Menerima payload:

```json
{
  "wa_phone": "+628111111111",
  "display_name": "Budi",
  "book_title": "Atomic Habits",
  "book_author": "James Clear",
  "content": "Habit stacking: tumpuk kebiasaan baru di atas yang lama.",
  "raw_message": "@bot tadi baca Atomic Habits, bagian habit stacking itu..."
}
```

Logika di endpoint ini:
- Upsert member berdasarkan `wa_phone`
- Upsert book berdasarkan `title` (case-insensitive match)
- Insert note baru

### Admin API (`/api/admin/*`)
Semua endpoint admin memerlukan query param `?key=ADMIN_SECRET`. Tanpa key yang benar → 401.

| Method | Path | Aksi |
|---|---|---|
| GET | `/api/admin/data` | Semua members + books + notes sekaligus |
| GET | `/api/admin/data?bookType=Fiksi` | Filter books by tipe |
| GET | `/api/admin/data?bookReaderId=uuid` | Filter books by pembaca |
| GET | `/api/admin/data?bookTitle=atomic` | Filter books by judul (live search) |
| GET | `/api/admin/data?noteMemberId=uuid` | Filter notes by pembaca |
| GET | `/api/admin/data?noteBookId=uuid` | Filter notes by buku |
| GET | `/api/admin/data?noteBookTitle=atomic` | Filter notes by judul buku (live search) |
| POST | `/api/admin/members` | Tambah member baru |
| PATCH | `/api/admin/members/:id` | Edit nama + nomor WA (validasi unique) |
| DELETE | `/api/admin/members/:id` | Hapus member + semua catatannya (transaction) |
| POST | `/api/admin/books` | Tambah buku baru |
| PATCH | `/api/admin/books/:id` | Edit judul + penulis |
| DELETE | `/api/admin/books/:id` | Hapus buku + semua catatannya (transaction) |
| POST | `/api/admin/notes` | Tambah catatan manual |
| PATCH | `/api/admin/notes/:id` | Edit konten catatan |
| DELETE | `/api/admin/notes/:id` | Hapus catatan |

---

## Halaman Website

### Homepage (`/`)
- Daftar semua buku dalam grid
- Tiap kartu: judul, penulis, avatar pembaca, jumlah notes, preview notes terbaru
- Stats ringkas di header: jumlah buku, pembaca, catatan
- **Filter buku**: filter by tipe (Fiksi, Nonfiksi, dll), by pembaca, dan pencarian judul buku (live search)
- Filter tersimpan di URL (`?type=Nonfiksi&reader=uuid&title=atomic`) — bisa di-share/bookmark
- Tombol "Reset filter" untuk clear semua filter sekaligus

### Detail Buku (`/books/:id`)
- Info buku (judul, penulis, cover placeholder)
- Filter notes per pembaca (tabs)
- Semua notes tampil urut terbaru
- Konten catatan dirender sebagai **markdown** via `react-markdown` + class `.note-content`

### Halaman Admin (`/admin?key=SECRET`)
- Tab Anggota: CRUD member, edit nama + nomor WA
- Tab Buku: CRUD buku, edit judul + penulis
  - **Filter**: by tipe buku, by pembaca, dan pencarian judul (live search)
- Tab Catatan: CRUD catatan, edit konten dengan toggle Edit/Preview markdown
  - **Filter**: by pembaca, by buku, dan pencarian judul buku (live search)
- Proteksi via `ADMIN_SECRET` di env — key dikirim sebagai query param, divalidasi server-side
- Filter di admin bersifat client-side (data difilter saat fetch dari API)

---

## Desain

- **Vibe:** Cozy & warm — nuansa toko buku / kafe
- **Font:** Lora (heading), Crimson Pro (body)
- **Warna utama:** cream (`#F5F0E8`), amber (`#D4824A`), brown (`#2C1A0E`)
- **Bahasa:** Indonesia
- **Quote footer:** *"We read to know we are not alone."* — C.S. Lewis
- Tidak ada Tailwind — semua styling pakai inline styles + CSS variables di `globals.css`

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key-here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ADMIN_SECRET=ganti_dengan_secret_acak   # untuk akses /admin?key=...

# n8n (set di environment n8n, bukan di .env project)
WAHA_BASE_URL=http://localhost:3000   # URL instance WAHA
WAHA_SESSION=default                  # nama session WAHA
WAHA_API_KEY=                         # opsional, jika WAHA pakai API key
```

> **Catatan:** Dapatkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` dari Supabase Dashboard → Settings → API.

---

## Status Project

- [x] Database schema + seed data (terpisah di `migrations/`)
- [x] Next.js website (homepage + detail buku)
- [x] API routes (GET books, GET book detail, POST notes)
- [x] n8n workflow (WA → Claude → POST /api/notes)
- [x] Halaman admin (`/admin`) — full CRUD members, books, notes
- [x] Render markdown di halaman detail buku
- [x] `.gitignore` + environment setup (`.env`)
- [x] Filter buku by tipe dan pembaca (homepage + admin)
- [x] Filter catatan by pembaca dan buku (admin)
- [ ] Deploy ke VPS

---

## Yang Belum Dikerjakan

### n8n / WA Bot
Di-pending. Workflow sudah selesai di `n8n-workflow.json` (pakai WAHA, bukan Meta Cloud API). Saat siap deploy: import ke n8n, set credential Anthropic API, set env vars `WAHA_BASE_URL`, `WAHA_SESSION`, `NEXT_PUBLIC_BASE_URL`.

### Deploy ke VPS
- n8n akan self-hosted di VPS yang sudah ada
- Next.js bisa di-host di VPS yang sama atau Vercel

---

## Catatan Penting

- **Jangan pakai Prisma** — project ini sengaja pakai Supabase Client SDK
- **Jangan pakai Tailwind** — styling pakai inline styles
- **Tidak ada auth publik** — website read-only dan publik; halaman admin dilindungi `ADMIN_SECRET` via query param
- **`db.ts` exports Supabase client** — digunakan di semua API routes
- `page.tsx` (homepage) adalah Server Component — jangan tambahkan event handlers di sini, gunakan komponen terpisah dengan `'use client'`
- **`content` di tabel notes adalah markdown** — Claude memformat konten saat ekstraksi dari WA; dirender dengan `react-markdown` + class `.note-content`; preview di BookGrid distrip dengan `stripMarkdown()` dari `utils.ts`
- **`react-markdown` perlu `transpilePackages`** — sudah dikonfigurasi di `next.config.js` karena library ini ESM-only

---

## Supabase Query Syntax (PENTING!)

### Foreign Key Relationships

Saat query dengan foreign key, **harus pakai nama kolom foreign key**, bukan nama tabel:

```typescript
// ✅ BENAR - pakai nama kolom foreign key
members:member_id (display_name, wa_phone)
books:book_id (title, author)
notes:notes(member_id)  // dari members table

// ❌ SALAH - ini TIDAK akan bekerja
member:members (display_name)
book:books (title)
notes (id)
```

**Format:** `alias:foreign_key_column (fields)`

### Data Mapping

Setelah query, akses nested data sesuai alias yang dipakai:

```typescript
// Jika query pakai: members:member_id (display_name)
const memberName = note.members?.display_name  // ✅
```

### Disable Cache untuk API Routes

Semua API route dan Server Component yang butuh data fresh harus punya:

```typescript
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

### UTC Timestamp Parsing

Timestamp dari Supabase **tidak ada `Z` di akhir**. Tambahkan `Z` supaya di-parse sebagai UTC:

```typescript
const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
```