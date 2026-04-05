import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { uploadToR2, generateSignedUrl, deleteFromR2 } from '@/lib/r2'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function checkAuth(req: NextRequest) {
  const key = new URL(req.url).searchParams.get('key')
  return key === process.env.ADMIN_SECRET
}

function ext(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'bin'
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let title: string, author: string | null, type: string | null, coverFile: File | null = null

    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      title = (form.get('title') as string)?.trim()
      author = (form.get('author') as string)?.trim() || null
      type = (form.get('type') as string)?.trim() || null
      coverFile = form.get('file') as File | null
    } else {
      const body = await req.json()
      title = body.title?.trim()
      author = body.author?.trim() || null
      type = body.type?.trim() || null
    }

    if (!title) {
      return NextResponse.json({ error: 'Judul buku wajib diisi' }, { status: 400 })
    }

    const updateData: Record<string, string | null> = { title, author, type }

    if (coverFile && coverFile.size > 0) {
      // Delete old cover from R2 if exists
      const { data: existing } = await supabase
        .from('books')
        .select('cover_r2_key')
        .eq('id', params.id)
        .single()

      if (existing?.cover_r2_key) {
        await deleteFromR2(existing.cover_r2_key).catch(() => {})
      }

      const r2Key = `covers/${params.id}.${ext(coverFile.name)}`
      const buffer = Buffer.from(await coverFile.arrayBuffer())
      await uploadToR2(r2Key, buffer, coverFile.type || 'image/jpeg')

      const signedUrl = await generateSignedUrl(r2Key)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      updateData.cover_url = signedUrl
      updateData.cover_r2_key = r2Key
      updateData.cover_url_expires_at = expiresAt
    }

    const { data, error } = await supabase
      .from('books')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Buku tidak ditemukan' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: book } = await supabase
      .from('books')
      .select('cover_r2_key')
      .eq('id', params.id)
      .single()

    if (book?.cover_r2_key) {
      await deleteFromR2(book.cover_r2_key).catch(() => {})
    }

    const { error: notesError } = await supabase
      .from('notes')
      .delete()
      .eq('book_id', params.id)

    if (notesError) throw notesError

    const { data, error: bookError } = await supabase
      .from('books')
      .delete()
      .eq('id', params.id)
      .select()

    if (bookError) throw bookError

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Buku tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ id: params.id })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
