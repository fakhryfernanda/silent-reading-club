# Tailwind CSS Migration Plan

## Overview

Migrate all inline styles + CSS variables in `globals.css` to Tailwind CSS utility classes across **9 TSX files** and **1 CSS file**. The project uses a warm, bookish design system with ~8 CSS custom properties, two Google Fonts (Lora, Crimson Pro), and extensive inline `style={{}}` patterns with hover handlers.

---

## 1. Setup

### 1.1 Install dependencies

Pin ke Tailwind v3 secara eksplisit untuk menghindari breaking changes dari v4:

```bash
npm install -D tailwindcss@3 postcss@latest autoprefixer@latest @tailwindcss/typography@latest
```

### 1.2 Initialize Tailwind config
```bash
npx tailwindcss init -p
```

This creates `tailwind.config.js` and adds `postcss.config.js`.

### 1.3 Configure `tailwind.config.js`

> **Token naming notes:**
> - `border` diubah ke `bookBorder` untuk menghindari konflik dengan Tailwind's built-in `border` utilities
> - `amber` diubah ke `accent` untuk menghindari konflik dengan Tailwind's built-in `amber` palette

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F5F0E8',
        brown: {
          dark: '#2C1A0E',
          mid: '#6B3F1F',
          light: '#C4956A',
        },
        accent: '#D4824A',       // was: amber (konflik dengan Tailwind built-in)
        muted: '#7A5C3E',
        bookBorder: 'rgba(107, 63, 31, 0.15)',  // was: border (konflik dengan Tailwind built-in)
        cardBg: '#FAF6EE',
        placeholder: '#E8E0D4',
        danger: '#c0392b',
      },
      fontFamily: {
        lora: ['Lora', 'serif'],
        crimson: ['Crimson Pro', 'Georgia', 'serif'],
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease both',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      boxShadow: {
        book: '4px 6px 20px rgba(44, 26, 14, 0.2)',
        card: '0 4px 12px rgba(44, 26, 14, 0.1)',
        cardHover: '0 8px 28px rgba(44, 26, 14, 0.1)',
        image: '0 8px 32px rgba(44, 26, 14, 0.2)',
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            color: theme('colors.brown.dark'),
            fontFamily: "'Crimson Pro', Georgia, serif",
            strong: { color: theme('colors.brown.dark') },
            blockquote: {
              borderLeftColor: theme('colors.accent'),
              color: theme('colors.brown.mid'),
            },
            code: {
              backgroundColor: 'rgba(107, 63, 31, 0.08)',
              fontFamily: 'monospace',
            },
            'h1, h2, h3': {
              fontFamily: "'Lora', serif",
              color: theme('colors.brown.dark'),
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

> **Catatan:** Typography config menggunakan `theme()` helper untuk referensi token yang sudah didefinisikan di `colors`, bukan hardcode hex. Ini menjaga konsistensi — kalau warna berubah, prose ikut otomatis.

### 1.4 Verify `postcss.config.js`

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 1.5 Replace `src/app/globals.css`

Replace the entire file with:

```css
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Crimson+Pro:wght@300;400&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html,
  body {
    @apply min-h-screen bg-cream text-brown-dark font-crimson text-base leading-[1.7];
    background-image:
      radial-gradient(ellipse at 20% 0%, rgba(196, 149, 106, 0.18) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 100%, rgba(212, 130, 74, 0.12) 0%, transparent 55%);
  }

  a {
    @apply text-inherit no-underline;
  }

  * {
    @apply box-border m-0 p-0;
  }
}

@layer components {
  .note-content {
    @apply prose prose-base max-w-none;
  }
}

@layer utilities {
  [data-pagination] {
    @apply flex flex-col items-center gap-3 mb-[60px] pt-6 border-t border-bookBorder;
  }

  [data-carousel-scroll]::-webkit-scrollbar {
    display: none;
  }

  [data-carousel-scroll] {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}
```

> **Catatan:** Nested `.prose` overrides dihapus dari `@layer components` karena sudah di-handle oleh typography config di `tailwind.config.js`. Hindari duplikasi.

### 1.6 Cek styled-jsx di ImageCarousel

Sebelum migrasi ImageCarousel, verifikasi apakah `<style jsx global>` saat ini bekerja:

```bash
grep -r "jsx global" src/
```

Next.js 14 App Router tidak otomatis include styled-jsx. Jika ada, migrasi seluruh isi `<style jsx global>` ke `globals.css` di `@layer utilities` (keyframes `fadeIn` dan scrollbar hiding sudah ada di plan ini). Hapus `<style jsx global>` block setelah migrasi.

---

## 2. CSS Variables → Tailwind Tokens Mapping

### Primary CSS variables from `globals.css`:

| CSS Variable | Hex Value | Tailwind Token | Usage Pattern |
|---|---|---|---|
| `--cream` | `#F5F0E8` | `bg-cream` | Page background |
| `--brown-dark` | `#2C1A0E` | `text-brown-dark`, `bg-brown-dark` | Primary text, headings |
| `--brown-mid` | `#6B3F1F` | `text-brown-mid`, `bg-brown-mid` | Secondary text, accents |
| `--brown-light` | `#C4956A` | `text-brown-light`, `border-brown-light` | Avatar colors, borders |
| `--amber` | `#D4824A` | `text-accent`, `bg-accent`, `border-accent` | Accent color, active states |
| `--text` | `#2C1A0E` | `text-brown-dark` | Same as brown-dark |
| `--text-muted` | `#7A5C3E` | `text-muted` | Muted/caption text |
| `--border` | `rgba(107,63,31,0.15)` | `border-bookBorder` | Dividers, card borders |
| `--card-bg` | `#FAF6EE` | `bg-cardBg` | Card backgrounds |

### Additional hardcoded colors found in inline styles:

| Hex | Where Used | Proposed Token |
|---|---|---|
| `#E8E0D4` | BookGrid "No Cover" placeholder bg | `bg-placeholder` |
| `#4a3728` | BookFilters cover-mode hover | `bg-brown-dark` (approximate) |
| `#3d2b1f` | BookFilters cover-mode button bg | `bg-brown-dark` |
| `#fdf6ee` | BookFilters cover-mode text | `text-cardBg` |
| `#c0392b` | admin delete button | `bg-danger` |
| `rgba(44,26,14,0.1)` | ImageCarousel button bg | `bg-brown-dark/10` |
| `rgba(44,26,14,0.2)` | ImageCarousel hover bg, box-shadows | `bg-brown-dark/20` |
| `rgba(245,240,232,0.95)` | ImageCarousel backdrop | `bg-cream/95` |
| `rgba(212,130,74,0.12)` | admin error banner bg | `bg-accent/10` |  
| `rgba(212,130,74,0.15)` | SearchableSelect highlight | `bg-accent/15` |

> **Opacity modifier syntax:** Gunakan Tailwind's opacity modifier (`/10`, `/15`, `/20`, dll) untuk warna dengan opacity. Jika nilai tidak ada di skala bawaan (misal `/[8%]`), gunakan arbitrary value: `bg-brown-dark/[0.08]` — bukan `/8`.

### Avatar colors (kept as dynamic inline styles):
These 6 colors are hashed by `avatarColor(name)` and **must stay as inline styles**:
- `#C4956A`, `#8B5E3C`, `#D4824A`, `#6B3F1F`, `#A07040`, `#B87040`

---

## 3. File Inventory

| # | File | Complexity | Inline Style Objects | Key Patterns |
|---|---|---|---|---|
| 1 | `src/app/globals.css` | **Low** | N/A | CSS variables, `.note-content`, `.animate-fade-up`, `@media` responsive |
| 2 | `src/app/layout.tsx` | **Low** | 0 | Just `<body>{children}` — no styles to convert |
| 3 | `src/app/page.tsx` | **Medium** | ~15 | Header with stats, footer, `className="homepage-header/heading"`, Suspense fallback |
| 4 | `src/components/BookFilters.tsx` | **Medium** | ~12 | `chipStyle(active)` function, `selectStyle` constant, hover via `onMouseEnter/Leave`, input/select styling |
| 5 | `src/components/BookGrid.tsx` | **High** | ~40 | Dual mode (cover/info), complex hover mutations (`e.currentTarget.style`), staggered `animationDelay`, pagination UI, CSS grid, responsive `window.innerWidth` |
| 6 | `src/app/books/[id]/page.tsx` | **High** | ~35 | Hero section, reader tabs, note cards with markdown, attachment thumbnails, back-to-top button, `className="note-content/animate-fade-up"` |
| 7 | `src/components/ImageCarousel.tsx` | **High** | ~25 | Full-screen modal overlay, dynamic `transform: scale() translate()`, zoom controls, swipe gestures, `<style jsx global>` untuk animasi + scrollbar hiding |
| 8 | `src/components/SearchableMemberSelect.tsx` | **Medium** | ~8 | Dropdown with keyboard nav, `inputStyle`, `dropdownStyle`, `getItemStyle(isHighlighted)`, `clearButtonStyle` constants |
| 9 | `src/components/SearchableBookSelect.tsx` | **Medium** | ~10 | Same as MemberSelect + "Lanjut baca / Buku baru" toggle buttons, `selectedMemberId` filter |
| 10 | `src/app/admin/page.tsx` | **High** | ~60 | 1482 lines, 7 sub-components (MembersList, BooksList, NotesList, NotesFilter, FormField, ActionButtons, EmptyState), shared `inputStyle` + `btnBase` constants, CRUD forms, attachment upload/delete UI |

### Summary:
- **Low**: 2 files (globals.css, layout.tsx)
- **Medium**: 4 files (page.tsx, BookFilters, SearchableMemberSelect, SearchableBookSelect)
- **High**: 4 files (BookGrid, books/[id]/page, ImageCarousel, admin/page)

---

## 4. Execution Order

### Phase 1: Foundation
**Files:** `tailwind.config.js`, `postcss.config.js`, `globals.css`, `layout.tsx`

1. Install dependencies + create config files with custom tokens
2. Replace `globals.css` with `@tailwind` directives + `@layer base/components`
3. Verify `layout.tsx` still works (no changes needed, just confirm)
4. **Jalankan `npm run build`** — verifikasi build pipeline berjalan sebelum menyentuh komponen apapun

**Why first:** Establishes design tokens before touching components. Verifies build pipeline works before any conversion.

### Phase 2: Shared Components (used by multiple pages)
**Files:** `BookFilters.tsx` → `SearchableMemberSelect.tsx` → `SearchableBookSelect.tsx`

5. **BookFilters.tsx** — used by both home page AND admin page. Convert `chipStyle()` and `selectStyle` to conditional class names. Ganti semua referensi `var(--amber)` ke `accent`, `var(--border)` ke `bookBorder`.
6. **SearchableMemberSelect.tsx** — self-contained dropdown. Convert `inputStyle`, `dropdownStyle`, `getItemStyle()`, `clearButtonStyle`.
7. **SearchableBookSelect.tsx** — near-identical to MemberSelect. Apply same conversion patterns + handle additional "read mode" toggle.

**Why second:** These components are imported by multiple pages. Converting them first means pages that use them will inherit correctly-styled sub-components. MemberSelect first because it's simpler.

### Phase 3: Pages + Their Components
**Files:** `page.tsx` → `books/[id]/page.tsx` → `BookGrid.tsx` → `ImageCarousel.tsx`

8. **`src/app/page.tsx`** (Home) — medium complexity. Header, stats, footer. Uses BookFilters (already converted). Has `className="homepage-header"` dengan `@media` `!important` overrides → convert ke Tailwind responsive utilities.
9. **`src/app/books/[id]/page.tsx`** (Book Detail) — high complexity. Hero, reader tabs, notes dengan markdown rendering. Uses `className="note-content"` (handled by `@layer components`) and `className="animate-fade-up"` (handled by `animate-fade-up` utility).
10. **`BookGrid.tsx`** — highest inline style count. Complex hover mutations → replace dengan `hover:` utilities. Staggered animation → keep `style={{ animationDelay }}` (legitimate dynamic). Dual mode toggle.
11. **`ImageCarousel.tsx`** — dynamic `transform` must stay inline. Replace static styles (positioning, border-radius, button styling) dengan Tailwind. Pindahkan seluruh isi `<style jsx global>` ke `globals.css @layer utilities`, lalu hapus block tersebut.

**Why third:** Pages depend on components from Phase 2. Order follows dependency graph.

### Phase 4: Admin (largest, most complex)
**Files:** `src/app/admin/page.tsx`

12. **Admin page** — 1482 lines, 7 sub-components. Convert shared `inputStyle` + `btnBase` constants ke Tailwind classes (extract ke `@apply` di `@layer components` jika dipakai banyak tempat). Convert semua 7 sub-components. Uses BookFilters, SearchableBookSelect, SearchableMemberSelect (sudah converted).

**Why last:** Largest file with the most style objects. Do last because it imports already-converted components.

---

## 5. Risks & Mitigations

### Risk 1: Breaking `.note-content` markdown rendering
**What breaks:** The `.note-content` CSS class applies styles to all children of `<ReactMarkdown>` output (`p`, `strong`, `em`, `ul`, `ol`, `li`, `blockquote`, `code`, `h1-h3`). Tailwind utilities on the parent don't cascade.

**Mitigation:** Use `@tailwindcss/typography` plugin. Apply `className="prose prose-base max-w-none"` to the markdown container. Customize prose colors di `tailwind.config.js` menggunakan `theme()` helper (bukan hardcode hex) untuk referensi token yang konsisten:

```js
typography: ({ theme }) => ({
  DEFAULT: {
    css: {
      color: theme('colors.brown.dark'),
      // dst — lihat tailwind.config.js di section 1.3
    },
  },
}),
```

### Risk 2: `!important` mobile responsive overrides
**What breaks:** `globals.css` has `@media (max-width: 768px)` rules dengan `!important` on `.homepage-header` (padding, margin) dan `.homepage-heading` (font-size). Tailwind's mobile-first responsive prefixes (`sm:`, `md:`) use different specificity.

**Mitigation:** Convert ke Tailwind responsive utilities langsung di element:

```tsx
// Before:

  

// After:

  
```

Hapus semua `!important` — tidak diperlukan dengan Tailwind.

### Risk 3: Hover mutations via `e.currentTarget.style`
**What breaks:** BookGrid dan BookFilters menggunakan imperative DOM manipulation:

```tsx
onMouseEnter={e => {
  e.currentTarget.style.transform = 'translateY(-3px)'
  e.currentTarget.style.boxShadow = '0 8px 28px rgba(44,26,14,0.1)'
}}
```

**Mitigation:** Replace dengan Tailwind `hover:` utilities:

```tsx
className="hover:-translate-y-[3px] hover:shadow-cardHover transition-all duration-200"
```

Hapus `onMouseEnter`/`onMouseLeave` handlers setelah konversi.

### Risk 4: Dynamic style functions
**What breaks:** `chipStyle(active)`, `getItemStyle(highlighted)` mengembalikan object berbeda berdasarkan state.

**Mitigation:** Convert ke conditional class strings:

```tsx
// chipStyle(active)
className={`font-lora text-[13px] px-[14px] py-1 rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer ${
  active ? 'bg-accent text-white border-none' : 'bg-cardBg border border-bookBorder text-muted'
}`}

// getItemStyle(isHighlighted)
className={`px-4 py-2 cursor-pointer font-crimson text-[15px] text-brown-dark transition-colors duration-150 ${
  isHighlighted ? 'bg-accent/[0.15]' : 'bg-transparent'
}`}
```

### Risk 5: `<style jsx global>` di ImageCarousel
**What breaks:** Next.js 14 App Router tidak otomatis include styled-jsx. `<style jsx global>` mungkin tidak bekerja atau menyebabkan error saat build.

**Mitigation:**
1. Jalankan `grep -r "jsx global" src/` untuk konfirmasi penggunaan
2. Pindahkan seluruh isi block ke `globals.css`:
   - Keyframes `fadeIn` → sudah ada di `tailwind.config.js` sebagai `animate-fade-in`
   - Scrollbar hiding untuk `[data-carousel-scroll]` → sudah ada di `@layer utilities`
3. Hapus `<style jsx global>` block dari `ImageCarousel.tsx`
4. Verifikasi carousel masih berfungsi setelah penghapusan

### Risk 6: Staggered `animationDelay`
**What breaks:** BookGrid sets `animationDelay: ${i * 0.07}s` dynamically per card index. Tidak ada built-in Tailwind utility untuk arbitrary delays.

**Mitigation:** Keep as inline style — ini legitimate dynamic value:

```tsx
className="animate-fade-up"
style={{ animationDelay: `${i * 0.07}s` }}
```

### Risk 7: Dynamic transform in ImageCarousel
**What breaks:** `transform: scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)` computed dari state.

**Mitigation:** Keep as inline style:

```tsx
style={{
  transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
  transformOrigin: 'center center',
  cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
  transition: isPanning ? 'none' : 'transform 0.2s ease-in-out',
}}
```

### Risk 8: `avatarColor(name)` hashed colors
**What breaks:** Returns one of 6 colors based on character code hash.

**Mitigation:** Keep as inline style — tidak bisa di-pre-define:

```tsx
style={{ background: avatarColor(name) }}
```

### Risk 9: Visual regression
**Mitigation:** Ambil screenshot baseline di 375px, 768px, 1280px sebelum migrasi. Bandingkan setelah setiap phase. Perhatikan: border radii, padding values, shadow intensities, transition durations.

### Risk 10: Build failure
**Mitigation:**
- Pin Tailwind v3 (`tailwindcss@3`) — v4 punya breaking changes signifikan pada format config
- Setelah Phase 1 setup, jalankan `npm run build` SEBELUM menyentuh komponen apapun
- Verifikasi `postcss.config.js` memiliki plugin `tailwindcss` dan `autoprefixer`

---

## 6. Conversion Reference: Inline → Tailwind

### Common patterns found in this project:

> **Catatan token:** Semua referensi `amber` → `accent`, semua referensi `border` (warna) → `bookBorder`.

| Inline Style | Tailwind Equivalent | Notes |
|---|---|---|
| `style={{ fontFamily: 'Lora, serif' }}` | `font-lora` | Custom token |
| `style={{ fontFamily: 'Crimson Pro, serif' }}` | `font-crimson` | Custom token |
| `style={{ color: 'var(--brown-dark)' }}` | `text-brown-dark` | |
| `style={{ color: 'var(--text-muted)' }}` | `text-muted` | |
| `style={{ color: 'var(--amber)' }}` | `text-accent` | |
| `style={{ background: 'var(--card-bg)' }}` | `bg-cardBg` | |
| `style={{ background: 'var(--amber)' }}` | `bg-accent` | |
| `style={{ border: '1px solid var(--border)' }}` | `border border-bookBorder` | |
| `style={{ borderRadius: 10 }}` | `rounded-[10px]` | |
| `style={{ borderRadius: 8 }}` | `rounded-lg` | 8px exact |
| `style={{ borderRadius: 6 }}` | `rounded-md` | 6px exact |
| `style={{ borderRadius: 999 }}` | `rounded-full` | |
| `style={{ borderRadius: 4 }}` | `rounded` | 4px exact |
| `style={{ borderRadius: 20 }}` | `rounded-[20px]` | |
| `style={{ padding: '22px 24px' }}` | `px-6 py-[22px]` | |
| `style={{ padding: '8px 16px' }}` | `px-4 py-2` | |
| `style={{ padding: '4px 14px' }}` | `px-[14px] py-1` | |
| `style={{ padding: '4px 12px' }}` | `px-3 py-1` | |
| `style={{ gap: 32 }}` | `gap-8` | |
| `style={{ gap: 24 }}` | `gap-6` | |
| `style={{ gap: 16 }}` | `gap-4` | |
| `style={{ gap: 12 }}` | `gap-3` | |
| `style={{ gap: 8 }}` | `gap-2` | |
| `style={{ maxWidth: 860, margin: '0 auto' }}` | `max-w-[860px] mx-auto` | |
| `style={{ display: 'flex', alignItems: 'center', gap: 12 }}` | `flex items-center gap-3` | |
| `style={{ display: 'flex', flexDirection: 'column', gap: 16 }}` | `flex flex-col gap-4` | |
| `style={{ display: 'flex', justifyContent: 'space-between' }}` | `flex justify-between` | |
| `style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}` | `grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))]` | |
| `style={{ fontSize: 52, fontWeight: 600 }}` | `text-[52px] font-semibold` | |
| `style={{ fontSize: 20 }}` | `text-xl` | |
| `style={{ fontSize: 18 }}` | `text-lg` | |
| `style={{ fontSize: 14 }}` | `text-sm` | |
| `style={{ fontSize: 13 }}` | `text-[13px]` | Bukan `text-xs` (12px) |
| `style={{ fontSize: 12 }}` | `text-xs` | |
| `style={{ letterSpacing: '0.05em' }}` | `tracking-wide` | |
| `style={{ letterSpacing: '0.08em' }}` | `tracking-wider` | |
| `style={{ letterSpacing: '0.1em' }}` | `tracking-widest` | |
| `style={{ letterSpacing: '0.15em' }}` | `tracking-[0.15em]` | |
| `style={{ transition: 'all 0.15s' }}` | `transition-all duration-150` | |
| `style={{ transition: 'all 0.2s' }}` | `transition-all duration-200` | |
| `style={{ boxShadow: '0 4px 12px rgba(44,26,14,0.1)' }}` | `shadow-card` | |
| `style={{ boxShadow: '0 8px 28px rgba(44,26,14,0.1)' }}` | `shadow-cardHover` | |
| `style={{ boxShadow: '4px 6px 20px rgba(44,26,14,0.2)' }}` | `shadow-book` | |
| `style={{ boxShadow: '0 8px 32px rgba(44,26,14,0.2)' }}` | `shadow-image` | |
| `rgba(44,26,14,0.1)` | `bg-brown-dark/10` | Bukan `/[10]` |
| `rgba(44,26,14,0.2)` | `bg-brown-dark/20` | |
| `rgba(107,63,31,0.08)` | `bg-brown-mid/[0.08]` | Arbitrary — tidak ada `/8` di Tailwind |
| `rgba(212,130,74,0.12)` | `bg-accent/[0.12]` | Arbitrary |
| `rgba(212,130,74,0.15)` | `bg-accent/[0.15]` | Arbitrary |
| `style={{ flex: 1 }}` | `flex-1` | |
| `style={{ width: '100%' }}` | `w-full` | |
| `style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}` | `absolute inset-0` | |
| `style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}` | `fixed inset-0` | |
| `style={{ display: '-webkit-box', WebkitLineClamp: 2, ... }}` | `line-clamp-2` | |
| `onMouseEnter={e => e.currentTarget.style.color = 'var(--amber)'}` | `hover:text-accent` | |

---

## 7. What Stays as Inline Style (Legitimate Dynamic Values)

| Value | File | Reason |
|---|---|---|
| `style={{ animationDelay: \`${i * 0.07}s\` }}` | BookGrid | Computed dari array index |
| `style={{ transform: \`scale(${zoom}) translate(...)\` }}` | ImageCarousel | Computed dari zoom/pan state |
| `style={{ background: avatarColor(name) }}` | Multiple | Hashed color dari name |
| `style={{ opacity: showBackToTop ? 1 : 0 }}` | books/[id]/page | State-driven |
| `style={{ pointerEvents: showBackToTop ? 'auto' : 'none' }}` | books/[id]/page | State-driven |
| `style={{ maxWidth: imageOrientation === 'landscape' ? '90vw' : 'auto' }}` | ImageCarousel | Conditional dari aspect ratio |
| `style={{ maxHeight: imageOrientation === 'portrait' ? '90vh' : 'auto' }}` | ImageCarousel | Conditional dari aspect ratio |
| `style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}` | ImageCarousel | State-driven |
| `style={{ transition: isPanning ? 'none' : 'transform 0.2s ease-in-out' }}` | ImageCarousel | State-driven |
| `style={{ opacity: zoom <= minZoom ? 0.4 : 1 }}` | ImageCarousel | State-driven |
| `style={{ opacity: zoom >= maxZoom ? 0.4 : 1 }}` | ImageCarousel | State-driven |

---

## 8. Shared Style Constants → Conversion Strategy

### `inputStyle`
font-crimson text-[15px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 pr-6 w-full

Atau extract ke `@layer components` jika dipakai di 3+ tempat:

```css
@layer components {
  .input-underline {
    @apply font-crimson text-[15px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 pr-6 w-full;
  }
}
```

### `btnBase`
font-lora text-[13px] rounded-full border-none cursor-pointer px-3 py-1 transition-all duration-150

### `chipStyle(active)`

```tsx
className={`font-lora text-[13px] px-[14px] py-1 rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer ${
  active ? 'bg-accent text-white border-none' : 'bg-cardBg border border-bookBorder text-muted'
}`}
```

### `getItemStyle(isHighlighted)`

```tsx
className={`px-4 py-2 cursor-pointer font-crimson text-[15px] text-brown-dark transition-colors duration-150 ${
  isHighlighted ? 'bg-accent/[0.15]' : 'bg-transparent'
}`}
```

---

## 9. Estimated Effort

| Phase | Files | Style Objects | Estimated Effort |
|---|---|---|---|
| 1. Foundation | 3 configs + globals.css | N/A | 15-20 min |
| 2. Shared Components | 3 files | ~30 | 1-1.5 hrs |
| 3. Pages | 4 files | ~135 | 2.5-3.5 hrs |
| 4. Admin | 1 file (7 sub-components) | ~60 | 2-3 hrs |
| **Total** | **11 files** | **~225** | **6-8 hrs** |

---

## 10. Post-Migration Checklist

- [ ] `npm run build` passes dengan zero errors
- [ ] `npm run dev` renders semua halaman tanpa console warnings
- [ ] Visual regression check di 375px (mobile), 768px (tablet), 1280px (desktop)
- [ ] Tidak ada referensi ke CSS variable lama (`var(--amber)`, `var(--border)`, dll)
- [ ] Tidak ada referensi ke token lama (`text-amber` → `text-accent`, `border-border` → `border-bookBorder`)
- [ ] `globals.css` hanya berisi: `@import` (fonts), `@tailwind` directives, `@layer base`, `@layer components`, `@layer utilities`
- [ ] Tidak ada orphaned `style={{}}` selain legitimate dynamic values
- [ ] TypeScript compiles cleanly (`npx tsc --noEmit`)
- [ ] Semua hover/transition interactions bekerja dengan benar
- [ ] Mobile responsive behavior sesuai original (terutama ex-`@media (max-width: 768px)`)
- [ ] `react-markdown` rendering terlihat benar (prose styles sesuai original `.note-content`)
- [ ] ImageCarousel zoom/pan masih bekerja (dynamic transform preserved)
- [ ] `<style jsx global>` sudah dihapus dari ImageCarousel, carousel masih berfungsi
- [ ] Admin CRUD forms terlihat benar (inputs, selects, buttons, modals)
- [ ] Pagination UI bekerja (page numbers, prev/next buttons, hover states)
- [ ] Searchable select dropdowns bekerja (keyboard nav, highlight, clear button)
- [ ] Back-to-top button di book detail page bekerja (opacity transition)
- [ ] Attachments grid di notes render dengan benar
- [ ] Reader tabs di book detail page bekerja (active state, avatar initials)
- [ ] Cover mode toggle di home page bekerja