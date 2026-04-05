import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { uploadToR2, generateSignedUrl } from '@/lib/r2'

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

export async function POST(req: NextRequest) {
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

    const { data, error } = await supabase
      .from('books')
      .insert({ title, author, type })
      .select()
      .single()

    if (error) throw error

    if (coverFile && coverFile.size > 0) {
      const r2Key = `covers/${data.id}.${ext(coverFile.name)}`
      const buffer = Buffer.from(await coverFile.arrayBuffer())
      await uploadToR2(r2Key, buffer, coverFile.type || 'image/jpeg')

      const signedUrl = await generateSignedUrl(r2Key)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: updated, error: updateError } = await supabase
        .from('books')
        .update({ cover_url: signedUrl, cover_r2_key: r2Key, cover_url_expires_at: expiresAt })
        .eq('id', data.id)
        .select()
        .single()

      if (updateError) throw updateError
      return NextResponse.json(updated, { status: 201 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
