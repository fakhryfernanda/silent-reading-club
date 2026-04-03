export function timeAgo(dateStr: string): string {
  // Append 'Z' to ensure date is parsed as UTC (Supabase stores in UTC)
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  if (diff < 172800) return 'kemarin'
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`
  if (diff < 2592000) return `${Math.floor(diff / 604800)} minggu lalu`
  return `${Math.floor(diff / 2592000)} bulan lalu`
}

export function avatarColor(name: string): string {
  const colors = [
    '#C4956A', '#8B5E3C', '#D4824A',
    '#6B3F1F', '#A07040', '#B87040',
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

export function initials(name: string): string {
  // Get the first grapheme (handles emojis, surrogate pairs, etc.)
  const graphemes = [...name]
  const first = graphemes[0] || ''

  // Check if the name is emoji-only
  // If all characters are non-alphanumeric, treat as emoji-only
  const isEmojiOnly = !graphemes.some(g => /[a-zA-Z0-9]/.test(g))

  if (isEmojiOnly) {
    return first
  }

  // Check if name has two or more words
  const words = name.trim().split(/\s+/).filter(w => w.length > 0)
  if (words.length >= 2) {
    const firstLetter = [...words[0]][0]?.toUpperCase() || ''
    const secondLetter = [...words[1]][0]?.toUpperCase() || ''
    return firstLetter + secondLetter
  }

  return first.toUpperCase()
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/`(.+?)`/g, '$1')
    .trim()
}

/**
 * Remove problematic Unicode characters that cause hydration mismatch.
 * Removes:
 * - Arabic presentation forms (ﷺ, ﷽, etc.)
 * - Arabic ligatures extended
 * - Variation selectors and special formatting characters
 * Preserves:
 * - Regular Arabic text (U+0600-U+06FF)
 * - Common Latin, punctuation, etc.
 */
export function sanitizeText(text: string | null | undefined): string | null {
  if (!text) return null
  const cleaned = text
    .replace(/[\uFDF0-\uFDF9]/g, '') // Arabic ligatures (ﷺ U+FDFB, ﷽ U+FDFD, etc.)
    .replace(/[\uFD50-\uFD8F]/g, '') // Arabic ligatures extended
    .replace(/[\uFE70-\uFEFF]/g, '') // Arabic presentation forms-B
    .replace(/[\u200B-\u200F]/g, '') // Zero-width joiners and directional marks
    .replace(/[\u2028-\u202E]/g, '') // Line/paragraph separators and bidi overrides
    .trim()
  return cleaned || null
}

/**
 * Check if text contains Arabic characters (U+0600-U+06FF).
 * Used to skip preview for notes that contain Arabic text.
 */
export function hasArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text)
}
