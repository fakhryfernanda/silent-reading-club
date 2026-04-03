import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
        notes:notes(member_id)
      `)
      .order('created_at', { ascending: false })

    if (membersError) throw membersError

    const members = membersData?.map(m => ({
      ...m,
      note_count: (m.notes as any[])?.length || 0,
      notes: undefined
    }))

    // Get books with note count and sort by latest_note_at (same as /api/books)
    const { data: booksData, error: booksError } = await supabase
      .from('books')
      .select(`
        *,
        notes (
          id,
          content,
          created_at,
          members:member_id (
            id,
            display_name
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (booksError) throw booksError

    // Transform books with same logic as /api/books endpoint
    const books = booksData?.map(book => {
      const notes = book.notes as any[]
      const noteCount = notes?.length || 0

      // Get latest note for sorting
      const sortedNotes = notes?.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) || []
      const latestNote = sortedNotes[0]

      return {
        ...book,
        note_count: noteCount,
        latest_note_at: latestNote?.created_at || null,
        notes: undefined
      }
    })

    // Sort by latest_note_at DESC (same as /api/books)
    const sortedBooks = books?.sort((a, b) => {
      if (!a.latest_note_at) return 1
      if (!b.latest_note_at) return -1
      return new Date(b.latest_note_at).getTime() - new Date(a.latest_note_at).getTime()
    })

    // Get notes with member and book info
    const { data: notesData, error: notesError } = await supabase
      .from('notes')
      .select(`
        *,
        members:member_id (display_name, wa_phone),
        books:book_id (title, author)
      `)
      .order('created_at', { ascending: false })

    if (notesError) throw notesError

    const notes = notesData?.map((n: any) => ({
      ...n,
      member_name: n.members?.display_name,
      book_title: n.books?.title,
      members: undefined,
      books: undefined
    }))

    return NextResponse.json({
      members,
      books: sortedBooks,
      notes,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
