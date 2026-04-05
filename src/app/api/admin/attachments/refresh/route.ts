import { NextRequest, NextResponse } from 'next/server'
import { refreshAttachmentsForNotes } from '@/lib/refreshAttachments'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (key !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const noteId = req.nextUrl.searchParams.get('note_id')
  if (!noteId) {
    return NextResponse.json({ error: 'note_id is required' }, { status: 400 })
  }

  const attachments = await refreshAttachmentsForNotes([noteId])
  return NextResponse.json(attachments)
}
