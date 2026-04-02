import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

function checkAuth(req: NextRequest) {
  const key = new URL(req.url).searchParams.get('key')
  return key === process.env.ADMIN_SECRET
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get members with note count
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select(`
        *,
        notes (id)
      `)
      .order('created_at', { ascending: false })

    if (membersError) throw membersError

    const members = membersData?.map(m => ({
      ...m,
      note_count: (m.notes as any[])?.length || 0,
      notes: undefined
    }))

    // Get books with note count
    const { data: booksData, error: booksError } = await supabase
      .from('books')
      .select(`
        *,
        notes (id)
      `)
      .order('created_at', { ascending: false })

    if (booksError) throw booksError

    const books = booksData?.map(b => ({
      ...b,
      note_count: (b.notes as any[])?.length || 0,
      notes: undefined
    }))

    // Get notes with member and book info
    const { data: notesData, error: notesError } = await supabase
      .from('notes')
      .select(`
        *,
        member:members (display_name),
        book:books (title)
      `)
      .order('created_at', { ascending: false })

    if (notesError) throw notesError

    const notes = notesData?.map((n: any) => ({
      ...n,
      member_name: n.member?.display_name,
      book_title: n.book?.title,
      member: undefined,
      book: undefined
    }))

    return NextResponse.json({
      members,
      books,
      notes,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
