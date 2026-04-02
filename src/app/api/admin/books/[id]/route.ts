import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

function checkAuth(req: NextRequest) {
  const key = new URL(req.url).searchParams.get('key')
  return key === process.env.ADMIN_SECRET
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const title = body.title?.trim()
  const author = body.author?.trim() || null
  const type = body.type?.trim() || null

  if (!title) {
    return NextResponse.json({ error: 'Judul buku wajib diisi' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('books')
      .update({ title, author, type })
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
    // Delete all notes for this book first
    const { error: notesError } = await supabase
      .from('notes')
      .delete()
      .eq('book_id', params.id)

    if (notesError) throw notesError

    // Delete the book
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
