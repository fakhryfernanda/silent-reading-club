import { supabase } from './db'
import { generateSignedUrl } from './r2'
import type { Attachment } from './types'

// Returns attachments for the given note IDs, refreshing signed URLs that are
// expired or expiring within the next hour.
export async function refreshAttachmentsForNotes(noteIds: string[]): Promise<Attachment[]> {
  if (noteIds.length === 0) return []

  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .in('note_id', noteIds)
    .order('created_at', { ascending: true })

  if (error) throw error
  if (!data || data.length === 0) return []

  const now = Date.now()
  const oneHourMs = 60 * 60 * 1000

  const refreshed = await Promise.all(
    data.map(async (att: Attachment) => {
      const expiresAt = att.url_expires_at
        ? new Date(att.url_expires_at.endsWith('Z') ? att.url_expires_at : att.url_expires_at + 'Z').getTime()
        : 0

      if (!att.signed_url || expiresAt < now + oneHourMs) {
        const newUrl = await generateSignedUrl(att.r2_key)
        const newExpiry = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()

        await supabase
          .from('attachments')
          .update({ signed_url: newUrl, url_expires_at: newExpiry })
          .eq('id', att.id)

        return { ...att, signed_url: newUrl, url_expires_at: newExpiry }
      }

      return att
    })
  )

  return refreshed
}
