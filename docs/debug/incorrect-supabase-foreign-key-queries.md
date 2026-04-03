# Debug: Incorrect Supabase Foreign Key Queries

**Date:** April 3, 2026
**Status:** ✅ Resolved

## Problem

Multiple pages and API routes were returning incomplete or empty data despite having records in the Supabase database. Specifically:

- Admin page showed **0 members** despite 2 members existing in database
- Admin page showed **stale/deleted notes** instead of current data
- Homepage showed incorrect reader counts

## Symptoms

### Symptom 1: Members Not Loading in Admin API

**Admin API (`/api/admin/data`) returned:**
```json
{
  "members": [],
  "books": [...],
  "notes": [...]
}
```

**Direct Supabase query worked:**
```bash
curl 'https://PROJECT.supabase.co/rest/v1/members?select=*'
# Returns 2 members correctly
```

### Symptom 2: Stale Data / Cache Issues

- Deleted notes still appeared in admin page
- Newly created notes didn't show up
- Data only updated after server restart

### Symptom 3: Incorrect Reader Counts

- Homepage showed "1 Pembaca" when there were 2 readers
- Book cards showed wrong reader information

## Root Cause

### Issue 1: Incorrect Supabase Foreign Key Syntax

The Supabase queries used incorrect syntax for foreign key relationships:

```typescript
// ❌ WRONG - This syntax doesn't resolve foreign keys properly
member:members (display_name)
book:books (title)
notes (id)
```

**Why it failed:**

In Supabase, when querying related tables through foreign keys, you must use the format:
```
alias:foreign_key_column (fields)
```

The `notes` table has:
- `member_id` → references `members(id)`
- `book_id` → references `books(id)`

So the correct syntax should reference the **column name**, not the table name.

### Issue 2: Next.js Route Caching

Next.js 14 caches API routes by default. Without explicit cache-busting configuration, API responses were stale:

- Deleted records still appeared in responses
- New records didn't show up until server restart
- No revalidation was happening

### Issue 3: UTC Time Parsing

The `timeAgo()` function didn't properly parse UTC timestamps from Supabase:

```typescript
// ❌ WRONG - Parses as local time, not UTC
const date = new Date(dateStr)
```

Supabase stores dates in UTC (e.g., `2026-04-02T18:47:14.427761`), but without the `Z` suffix, JavaScript's `new Date()` interprets it as **local time**, causing incorrect time differences.

## Solution

### Fix 1: Correct Foreign Key Syntax

Updated all Supabase queries to use proper foreign key column references:

**Files affected:**
- `src/app/api/admin/data/route.ts`
- `src/app/api/books/route.ts`
- `src/app/page.tsx`

**Before:**
```typescript
// members query
const { data: membersData } = await supabase
  .from('members')
  .select(`
    *,
    notes (id)
  `)

// books query
const { data: booksData } = await supabase
  .from('books')
  .select(`
    *,
    notes (
      id,
      content,
      created_at,
      member:members (id, display_name)
    )
  `)

// notes query
const { data: notesData } = await supabase
  .from('notes')
  .select(`
    *,
    member:members (display_name),
    book:books (title)
  `)
```

**After:**
```typescript
// members query - specify foreign key column
const { data: membersData } = await supabase
  .from('members')
  .select(`
    *,
    notes:notes(member_id)
  `)

// books query - use member_id column
const { data: booksData } = await supabase
  .from('books')
  .select(`
    *,
    notes (
      id,
      content,
      created_at,
      members:member_id (
        id,
        display_name
      )
    )
  `)

// notes query - use member_id and book_id columns
const { data: notesData } = await supabase
  .from('notes')
  .select(`
    *,
    members:member_id (display_name, wa_phone),
    books:book_id (title, author)
  `)
```

**Also updated data mapping:**
```typescript
// Before
member_name: n.member?.display_name
book_title: n.book?.title

// After
member_name: n.members?.display_name
book_title: n.books?.title
```

### Fix 2: Disable Next.js Route Caching

Added cache-busting exports to all API routes and server-rendered pages:

**Files affected:**
- `src/app/api/admin/data/route.ts`
- `src/app/api/books/route.ts`
- `src/app/api/books/[id]/route.ts`
- `src/app/page.tsx`

**Added at top of each file:**
```typescript
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

**What this does:**
- `dynamic = 'force-dynamic'` - Forces the route to be dynamic (no caching)
- `revalidate = 0` - Disables ISR (Incremental Static Regeneration)

### Fix 3: Parse UTC Timestamps Correctly

Updated `src/lib/utils.ts` to append `Z` suffix to ensure UTC parsing:

**Before:**
```typescript
export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  // ...
}
```

**After:**
```typescript
export function timeAgo(dateStr: string): string {
  // Append 'Z' to ensure date is parsed as UTC (Supabase stores in UTC)
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  // ...
}
```

**Why it works:**
- Adding `Z` tells JavaScript to parse the string as UTC
- `new Date()` (now) automatically uses the browser's local timezone (WIB/GMT+7)
- The difference calculation is accurate regardless of server timezone

## Verification

### Test 1: Admin API Returns Correct Data

```bash
curl 'http://localhost:3000/api/admin/data?key=fakhry' | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'Members: {len(data[\"members\"])}')
print(f'Books: {len(data[\"books\"])}')
print(f'Notes: {len(data[\"notes\"])}')
"
```

**Expected output:**
```
Members: 2
Books: 2
Notes: 2
```

### Test 2: Homepage API Returns Correct Readers

```bash
curl 'http://localhost:3000/api/books' | python3 -c "
import sys, json
data = json.load(sys.stdin)
readers = set()
for book in data:
    for r in book.get('readers', []):
        readers.add(r['id'])
print(f'Books: {len(data)} | Readers: {len(readers)} | Notes: {sum(b[\"note_count\"] for b in data)}')
"
```

**Expected output:**
```
Books: 2 | Readers: 2 | Notes: 2
```

### Test 3: Time Display is Correct

For a note created at `2026-04-02T18:47:14.427761` (UTC):
- In WIB (GMT+7): `2026-04-03T01:47:14`
- If current time is `07:03 WIB`, should display: **"5 jam lalu"**

## Key Takeaways

### Supabase Foreign Key Queries

**Correct syntax:**
```typescript
// Format: alias:foreign_key_column (fields)
table:column_name (field1, field2)

// Examples:
members:member_id (display_name, wa_phone)
books:book_id (title, author)
notes:notes(member_id)  // When querying from members table
```

**Wrong syntax:**
```typescript
// These DON'T work:
member:members (display_name)  // ❌ Wrong direction
notes (id)                     // ❌ Missing column reference
```

### Next.js Route Caching

- Next.js 14+ caches API routes by default
- Use `export const dynamic = 'force-dynamic'` to disable caching
- Use `export const revalidate = 0` to disable ISR
- Important for admin endpoints and real-time data

### UTC Date Parsing

- Supabase stores dates in UTC without `Z` suffix
- JavaScript's `new Date()` without `Z` parses as **local time**
- Always append `Z` to ensure UTC parsing
- Browser automatically converts to local timezone for display

## Related Files

- `src/app/api/admin/data/route.ts` - Admin data endpoint
- `src/app/api/books/route.ts` - Books API endpoint
- `src/app/api/books/[id]/route.ts` - Book detail API
- `src/app/page.tsx` - Homepage (Server Component)
- `src/lib/utils.ts` - Utility functions (timeAgo)
- `src/lib/db.ts` - Supabase client configuration

## Prevention

1. **Always test foreign key queries** with direct Supabase REST API calls first
2. **Use explicit column references** in all Supabase relationship queries
3. **Disable caching** for admin and real-time endpoints
4. **Append 'Z' to UTC timestamps** from Supabase
5. **Verify data consistency** between direct DB queries and API responses
