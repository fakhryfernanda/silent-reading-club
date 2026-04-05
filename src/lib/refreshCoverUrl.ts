import { supabase } from './db'
import { generateSignedUrl } from './r2'

const ONE_HOUR_MS = 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// Given a book row with cover fields, refresh the signed URL if expired.
// Returns the valid cover_url (or null if no cover).
export async function refreshBookCoverUrl(book: {
  id: string
  cover_url: string | null
  cover_r2_key?: string | null
  cover_url_expires_at?: string | null
}): Promise<string | null> {
  if (!book.cover_r2_key) return book.cover_url

  const expiresAt = book.cover_url_expires_at
    ? new Date(book.cover_url_expires_at.endsWith('Z') ? book.cover_url_expires_at : book.cover_url_expires_at + 'Z').getTime()
    : 0

  if (book.cover_url && expiresAt > Date.now() + ONE_HOUR_MS) {
    return book.cover_url
  }

  const newUrl = await generateSignedUrl(book.cover_r2_key)
  const newExpiry = new Date(Date.now() + SEVEN_DAYS_MS).toISOString()

  await supabase
    .from('books')
    .update({ cover_url: newUrl, cover_url_expires_at: newExpiry })
    .eq('id', book.id)

  return newUrl
}
