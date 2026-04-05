import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { deleteFromR2 } from '@/lib/r2'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const key = req.nextUrl.searchParams.get('key')
  if (key !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: attachment, error: fetchError } = await supabase
    .from('attachments')
    .select('r2_key')
    .eq('id', params.id)
    .single()

  if (fetchError || !attachment) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
  }

  await deleteFromR2(attachment.r2_key)

  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
