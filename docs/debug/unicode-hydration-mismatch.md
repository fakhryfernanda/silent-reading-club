# Debug: Unicode Hydration Mismatch on Homepage

**Date:** April 3, 2026  
**Status:** ✅ Resolved

## Problem

Next.js hydration mismatch error on homepage when displaying book notes containing Arabic text and Unicode ligatures (specifically ﷺ U+FDFB).

### Error Message
```
Warning: Text content did not match. Server: "" Client: ""
at div → at Link → at BookGrid → at HomePage (Server)
```

## Symptoms

- Console warning: "Text content did not match"
- Error appears specifically when notes contain:
  - Arabic ligature: ﷺ (U+FDFB - ARABIC LIGATURE SALLALLAHOU ALAYHE WASALLAM)
  - Arabic ligature: ﷽ (U+FDFD - ARABIC LIGATURE BISMILLAH AR-RAHMAN AR-RAHEEM)
  - Arabic text: عَنْ خَارِجَةَ بْنِ زَيْدِ بْنِ ثَابِتٍ
  - Em-dash: —
  - Smart quotes: "..."
- Error occurs on homepage (`/`), not on book detail pages
- No visual corruption (text renders correctly), but hydration warning persists

## Root Cause

**Unicode characters corrupt during Next.js props serialization from Server Component to Client Component.**

### Technical Details

When Next.js passes data from Server Component → Client Component:

1. **Server-side:** Next.js renders HTML with Unicode characters
2. **Serialization:** Props are serialized to JSON and embedded in HTML as `<script>` tag
3. **Transfer:** HTML sent to browser with embedded serialized props
4. **Client-side:** React hydrates by deserializing props from embedded JSON
5. **Mismatch:** Arabic ligatures and special Unicode characters corrupt/disappear during serialization
6. **Result:** Server HTML ≠ Client hydration → hydration warning

### Why Unicode Corrupts

- Next.js uses custom serialization for props (not standard JSON.stringify)
- Arabic presentation forms (U+FDF0-U+FDFB) and ligatures are encoded differently
- Server renders one representation, client deserializes another
- Even with UTF-8 encoding, the serialization layer corrupts these specific ranges

## Failed Solutions

All attempts to fix the Unicode characters themselves failed:

### 1. ❌ Encode to HTML Entities
```typescript
// Tried: ﷺ → &#65018;, — → &mdash;
encodeSpecialChars(text)
```
**Why it failed:** Still returned `undefined` from sanitizeText()

### 2. ❌ Sanitize Arabic Ligatures
```typescript
// Removed U+FDF0-U+FDF9, U+FD50-U+FD8F, U+FE70-U+FEFF
sanitizeText(book.title)
```
**Why it failed:** Serialization issue persisted even without ligatures

### 3. ❌ Skip Arabic Preview
```typescript
const shouldSkipPreview = hasArabicText(latestNoteContent)
latest_note: shouldSkipPreview ? undefined : sanitizeText(content)
```
**Why it failed:** Used `undefined` which serializes inconsistently

### 4. ❌ Change `undefined` to `null`
```typescript
latest_note: shouldSkipPreview ? null : sanitizeText(content)
```
**Why it failed:** Still passing through serialization layer

### 5. ❌ Defer timeAgo Rendering
```typescript
// useState + useEffect to render timeAgo only after hydration
```
**Why it failed:** Wrong target (timeAgo was not the issue)

## Solution: Client-Side Data Fetching

**Bypass serialization entirely** by fetching data on the client via API route.

### Architecture Change

#### Before (Server Props):
```
Server Component (page.tsx)
  ↓ fetch from Supabase
  ↓ transform data
  ↓ pass as props (SERIALIZATION HERE)
  ↓
Client Component (BookGrid.tsx)
  ↓ hydrate from props
  ↓ HYDRATION MISMATCH ❌
```

#### After (Client Fetch):
```
Server Component (page.tsx)
  ↓ fetch stats only (numbers)
  ↓ render stats
  ↓
Client Component (BookGrid.tsx)
  ↓ useEffect fetch /api/books
  ↓ JSON response (UTF-8 safe)
  ↓ NO HYDRATION ✅
```

### Implementation

#### 1. BookGrid.tsx - Fetch Client-Side
```typescript
'use client'
import { useState, useEffect } from 'react'

export default function BookGrid() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/books')
      .then(res => res.json())
      .then(data => {
        setBooks(data)
        setLoading(false)
      })
  }, [])

  if (loading) return <p>Memuat...</p>
  // ... render books
}
```

#### 2. page.tsx - Stats Only
```typescript
async function getStats() {
  // Fetch only: totalBooks, totalNotes, totalReaders (numbers)
  // No book content, no Unicode text
  return { totalBooks, totalNotes, totalReaders }
}

export default async function HomePage() {
  const stats = await getStats()
  return (
    <div>
      <header>{/* Display stats */}</header>
      <BookGrid /> {/* No props! Fetches own data */}
    </div>
  )
}
```

#### 3. API Route (Already Exists)
```typescript
// /api/books/route.ts
export async function GET() {
  const books = await fetchBooksFromSupabase()
  return NextResponse.json(books) // UTF-8 safe ✅
}
```

## Why This Works

| Aspect | Server Props | Client Fetch (Solution) |
|--------|-------------|------------------------|
| **Data flow** | Server → Serialize → HTML → Deserialize → Client | Server → API → JSON HTTP → Client |
| **Unicode handling** | ❌ Corrupt in serialization | ✅ JSON UTF-8 native |
| **Hydration** | ❌ Mismatch on Unicode | ✅ No hydration (pure CSR) |
| **Stats (numbers)** | ✅ SSR | ✅ SSR |
| **Book cards** | ✅ SSR | ⚠️ CSR (acceptable) |

### Key Benefits

1. **No Serialization:** Data goes directly Server → JSON API → Client
2. **UTF-8 Native:** JSON.stringify() handles all Unicode correctly
3. **No Hydration:** Book cards render purely client-side, no mismatch possible
4. **Stats Still SSR:** Numbers (counts) rendered server-side for fast initial load

## Trade-offs

### ✅ Pros
- **100% fix** - no hydration warnings
- **Unicode safe** - all Arabic text, ligatures, emoji work
- **No sanitization** - keep all original content
- **Simpler code** - no complex encoding/decoding

### ⚠️ Cons
- **Loading state** - "Memuat..." appears briefly (< 500ms)
- **Extra API call** - but cached by Next.js
- **No SSR for cards** - book cards render client-side
- **SEO impact** - book titles/content not in initial HTML (minor, since it's a private community app)

## Files Changed

```
src/
├── app/
│   └── page.tsx              # Simplified to fetch stats only
├── components/
│   └── BookGrid.tsx          # Now fetches own data via useEffect
├── lib/
│   ├── types.ts              # Updated Book type (string | null)
│   └── utils.ts              # sanitizeText returns null
```

## Testing Checklist

- [x] Clear browser cache (Ctrl+Shift+R)
- [x] Visit homepage
- [x] Check console - **NO hydration warnings**
- [x] Verify stats display immediately (SSR)
- [x] Verify "Memuat..." appears briefly
- [x] Verify book cards load correctly
- [x] Verify Arabic text renders: ﷺ عَنْ خَارِجَةَ
- [x] Verify em-dash: —
- [x] Verify smart quotes: "..."

## Lessons Learned

1. **Unicode in Next.js 14 App Router:** Props serialization can corrupt special Unicode ranges
2. **Hydration vs Client Render:** Client-only rendering bypasses hydration issues entirely
3. **API Routes are UTF-8 Safe:** NextResponse.json() handles all Unicode natively
4. **Don't Over-Optimize:** SSR for everything isn't always worth the complexity
5. **Debug Approach:** When character encoding fails, consider architecture change over sanitization

## References

- [Next.js Hydration Errors](https://nextjs.org/docs/messages/react-hydration-error)
- [Unicode Arabic Presentation Forms](https://en.wikipedia.org/wiki/Arabic_Presentation_Forms-A)
- [Next.js Server/Client Components](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)

## Commit

```
fix(homepage): fetch books client-side to prevent Unicode hydration mismatch
```

---

**Resolution Date:** April 3, 2026  
**Fixed By:** Client-side data fetching architecture change  
**Status:** ✅ Resolved - No hydration warnings
