# Debug: Books Not Loading on Main Page

**Date:** April 3, 2026  
**Status:** ✅ Resolved

## Problem

The main page (`/`) was not displaying books, showing "0 Buku" and "Belum ada buku" message, while the admin page (`/admin`) was working correctly and displaying all books.

## Symptoms

- Main page (`http://localhost:3000/`) showed:
  - `0 Buku`
  - `0 Pembaca`
  - `0 Catatan`
  - "Belum ada buku. Kirim notes pertamamu via WhatsApp!"
  
- Admin page worked fine and displayed all books

- API endpoint `/api/books` returned correct data:
  ```json
  [{"id":"d6dba8c0-7dd0-4243-bca3-621b4cf1e8ba","title":"Rights-based social policy analysis..."}]
  ```

## Root Cause

The issue was caused by **environment variables not being loaded** in the Next.js production server.

### Technical Details

1. **Main page (`src/app/page.tsx`)** uses **Server-Side Rendering (SSR)** with direct Supabase queries:
   ```tsx
   const { data: books } = await supabase.from('books').select(...)
   ```

2. **Admin page (`src/app/admin/page.tsx`)** uses **Client-Side Rendering (CSR)** with `useEffect`:
   ```tsx
   useEffect(() => {
     const res = await fetch(`/api/admin/data?key=${key}`)
   }, [])
   ```

3. **API routes** work because they run on the server and have access to environment variables at runtime.

4. **The problem:** Next.js in production mode (`npm start`) does **not** automatically load `.env` files. The environment variables must be available in the process environment **before** the server starts.

5. Since `src/lib/db.ts` uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, and these weren't loaded, the Supabase client couldn't connect properly during server-side rendering.

## Solution

### Step 1: Install `dotenv-cli`

```bash
npm install dotenv-cli --save-dev
```

### Step 2: Update `package.json` Scripts

Modify the scripts to use `dotenv` wrapper:

```json
{
  "scripts": {
    "dev": "dotenv -e .env -- next dev",
    "build": "dotenv -e .env -- next build",
    "start": "dotenv -e .env -- next start"
  }
}
```

### Step 3: Rebuild and Restart

```bash
# Stop existing server
pkill -f "next-server"

# Rebuild with environment variables loaded
dotenv -e .env -- npm run build

# Start server
dotenv -e .env -- npm start
```

Or simply:
```bash
npm run build && npm start
```

## Verification

After the fix, the main page should display:
- ✅ Correct book count (e.g., "1 Buku")
- ✅ Correct reader count (e.g., "1 Pembaca")
- ✅ Correct note count (e.g., "1 Catatan")
- ✅ Book cards with titles, authors, and notes

Test with:
```bash
curl -s http://localhost:3000 | grep -o '"Buku">[0-9]*'
```

## Alternative Solutions

### Option 2: Export Environment Variables Manually

```bash
export $(cat .env | xargs) && npm start
```

### Option 3: Use systemd with EnvironmentFile

For VPS deployments, create a systemd service:

```ini
[Unit]
Description=Silent Reading Club Next.js App
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/silent-reading-club
EnvironmentFile=/root/silent-reading-club/.env
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Key Takeaways

1. **Next.js production mode doesn't auto-load `.env`** - Unlike `next dev`, the `next start` command requires environment variables to be pre-loaded.

2. **SSR vs CSR** - Server Components need environment variables at build/start time, while client-side fetching works at runtime.

3. **`NEXT_PUBLIC_` variables** - These are available in both server and client code in Next.js 13+, but only if the `.env` file is properly loaded.

4. **Use `dotenv-cli`** - This is the cleanest solution for managing environment variables in production deployments.

## Related Files

- `src/app/page.tsx` - Main page with SSR
- `src/app/admin/page.tsx` - Admin page with CSR
- `src/lib/db.ts` - Supabase client configuration
- `.env` - Environment variables
- `package.json` - npm scripts

## Prevention

For future deployments:

1. Always rebuild after changing environment variables
2. Use `dotenv-cli` in all npm scripts
3. Consider setting up a proper deployment script or systemd service
4. Test both main page and admin page after deployments
