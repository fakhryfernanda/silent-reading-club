import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

function checkAuth(req: NextRequest) {
  const key = new URL(req.url).searchParams.get('key')
  return key === process.env.ADMIN_SECRET
}

export async function POST(req: NextRequest) {
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
      .insert({ title, author, type })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
