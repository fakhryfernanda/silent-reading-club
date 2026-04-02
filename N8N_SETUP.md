# Setup n8n Workflow — Silent Reading Club

Panduan lengkap untuk mengkonfigurasi workflow n8n yang menghubungkan WhatsApp ke website.

---

## Prasyarat

- n8n sudah berjalan (self-hosted di VPS atau n8n Cloud)
- Akun Meta for Developers dengan WhatsApp Business API aktif
- API key Anthropic (untuk Claude)
- Website Next.js sudah berjalan dan bisa diakses dari VPS

---

## 1. Import Workflow

1. Buka n8n di browser
2. Klik **Workflows** → **Add Workflow** → **Import from file**
3. Pilih file `n8n-workflow.json` dari root project ini
4. Klik **Import**

Workflow akan muncul dengan nama **"Silent Reading Club — WhatsApp Bot"** dalam kondisi **inactive**.

---

## 2. Konfigurasi Credentials

### Anthropic API

Node **"Panggil Claude"** membutuhkan credential Anthropic.

1. Di n8n, buka **Settings** → **Credentials** → **Add Credential**
2. Cari dan pilih **Anthropic**
3. Isi **API Key** dengan API key dari [console.anthropic.com](https://console.anthropic.com)
4. Simpan dengan nama misalnya "Anthropic API"
5. Kembali ke workflow, buka node **"Panggil Claude"**
6. Di bagian **Credential**, pilih credential yang baru dibuat

### Environment Variables di n8n

Tambahkan environment variable berikut ke n8n (edit file `.env` atau `docker-compose.yml` n8n-mu):

```env
# URL website Next.js (harus bisa diakses dari n8n)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Token verifikasi webhook WhatsApp — buat sendiri, string bebas
WA_VERIFY_TOKEN=token-rahasia-pilihan-sendiri
```

Setelah menambahkan env var, restart n8n.

---

## 3. Node-node yang Perlu Dikonfigurasi

### Node: Panggil Claude
- **Credential**: Pilih Anthropic API credential yang sudah dibuat
- **Model**: Sudah diset ke `claude-sonnet-4-20250514` di node "Buat Request Claude" (Code node)

### Node: Simpan Note ke Website
- **URL**: Otomatis menggunakan `$env.NEXT_PUBLIC_BASE_URL` — pastikan env var sudah diset
- Tidak ada konfigurasi tambahan

### Node: Proses Verifikasi
- **VERIFY_TOKEN**: Otomatis menggunakan `$env.WA_VERIFY_TOKEN` — pastikan env var sudah diset

---

## 4. Konfigurasi WhatsApp Cloud API (Meta)

### A. Buat Aplikasi di Meta for Developers

1. Buka [developers.facebook.com](https://developers.facebook.com)
2. Buat **New App** → tipe **Business**
3. Tambahkan produk **WhatsApp**
4. Catat **Phone Number ID** dan **WhatsApp Business Account ID**

### B. Daftarkan Webhook

1. Di halaman WhatsApp → **Configuration** → **Webhooks**
2. Klik **Edit** dan isi:
   - **Callback URL**: `https://n8n-kamu.contoh.com/webhook/silent-reading-club`
   - **Verify Token**: sama persis dengan nilai `WA_VERIFY_TOKEN` yang kamu set di n8n
3. Klik **Verify and Save**

> n8n akan menerima GET request dari Meta ke path `/webhook/silent-reading-club-verify` untuk verifikasi.
> Pastikan workflow sudah **active** sebelum melakukan langkah ini.

4. Setelah verified, subscribe ke field **messages**

### C. Aktifkan Workflow

1. Kembali ke workflow di n8n
2. Klik toggle **Active** di pojok kanan atas
3. Catat URL webhook yang muncul di node **"Trigger: Pesan WA"**:
   - Biasanya: `https://n8n-kamu.contoh.com/webhook/silent-reading-club`

> **Catatan:** URL webhook untuk verifikasi berbeda dari URL untuk menerima pesan:
> - Pesan masuk: `.../webhook/silent-reading-club` (POST)
> - Verifikasi: `.../webhook/silent-reading-club-verify` (GET)
>
> Saat mendaftarkan webhook di Meta dashboard, gunakan URL **pesan masuk** (POST).
> URL verifikasi hanya digunakan sekali saat setup awal oleh Meta secara otomatis.

---

## 5. Alur Kerja Setelah Setup

```
Anggota kirim pesan di grup WA dengan "@bot"
        ↓
WhatsApp Cloud API kirim webhook (POST) ke n8n
        ↓
n8n ekstrak: nomor WA, nama, teks pesan
        ↓
Cek apakah pesan mengandung "@bot"
        ↓
Claude mengekstrak: judul buku, penulis, isi notes
        ↓
POST ke /api/notes → disimpan ke PostgreSQL
        ↓
Notes muncul di website
```

---

## 6. Format Pesan yang Didukung

Bot dirancang untuk memahami pesan bebas, tidak perlu format khusus. Contoh pesan yang valid:

```
@bot habis baca Atomic Habits karya James Clear.
Bagian habit stacking itu keren — tumpuk kebiasaan baru di atas yang lama.
Jadi lebih gampang konsisten karena nggak mulai dari nol.
```

```
@bot lagi baca Deep Work by Cal Newport.
Intinya: kemampuan fokus tanpa distraksi adalah skill langka yang makin berharga.
Harus latih setiap hari kayak otot.
```

```
@bot guys buku The Almanack of Naval Ravikant bagus banget.
Naval bilang wealth comes from leverage — code, media, dan capital bisa bekerja saat kamu tidur.
```

Hal yang **tidak** perlu disertakan:
- Format khusus atau template
- Hashtag
- Judul buku dalam tanda kutip atau format tertentu

Jika Claude tidak bisa mengidentifikasi judul buku dengan jelas, pesan akan diabaikan dan tidak disimpan.

---

## 7. Troubleshooting

### Webhook tidak terverifikasi
- Pastikan workflow sudah **active** sebelum mendaftarkan webhook
- Pastikan `WA_VERIFY_TOKEN` di n8n sama persis dengan yang diisi di Meta dashboard
- Cek log eksekusi node "Proses Verifikasi" di n8n

### Pesan tidak tersimpan
- Cek **Executions** di n8n untuk melihat log per-eksekusi
- Pastikan `NEXT_PUBLIC_BASE_URL` mengarah ke alamat yang bisa diakses dari n8n
- Pastikan website Next.js sedang berjalan

### Claude tidak bisa mengekstrak info buku
- Pesan harus menyebutkan judul buku secara eksplisit
- Prompt Claude bisa diedit di node **"Buat Request Claude"** jika perlu penyesuaian

### Credential Anthropic error
- Pastikan API key valid dan tidak expired
- Pastikan akun Anthropic punya kredit yang cukup
