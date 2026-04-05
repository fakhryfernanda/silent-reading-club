import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { uploadToR2, generateSignedUrl } from '@/lib/r2'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function ext(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'bin'
}

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (key !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const noteId = formData.get('note_id') as string | null
  if (!noteId) {
    return NextResponse.json({ error: 'note_id is required' }, { status: 400 })
  }

  const files = formData.getAll('file') as File[]
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  try {
    const created = []
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

    for (const file of files) {
      const fileId = randomUUID()
      const extension = ext(file.name)
      const r2Key = `attachments/${noteId}/${fileId}.${extension}`

      const buffer = Buffer.from(await file.arrayBuffer())
      await uploadToR2(r2Key, buffer, file.type || 'application/octet-stream')

      const signedUrl = await generateSignedUrl(r2Key)
      const urlExpiresAt = new Date(Date.now() + sevenDaysMs).toISOString()

      const { data, error } = await supabase
        .from('attachments')
        .insert({
          note_id: noteId,
          r2_key: r2Key,
          file_name: file.name,
          mime_type: file.type || null,
          signed_url: signedUrl,
          url_expires_at: urlExpiresAt,
        })
        .select()
        .single()

      if (error) throw error
      created.push(data)
    }

    return NextResponse.json(created, { status: 201 })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 })
  }
}
