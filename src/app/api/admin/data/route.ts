import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { refreshAttachmentsForNotes } from '@/lib/refreshAttachments'
import { refreshBookCoverUrl } from '@/lib/refreshCoverUrl'

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
    const { searchParams } = new URL(req.url)
    const bookTypeFilter = searchParams.get('bookType')
    const bookReaderFilter = searchParams.get('bookReaderId')
    const bookTitleFilter = searchParams.get('bookTitle')
    const noteMemberFilter = searchParams.get('noteMemberId')
    const noteBookFilter = searchParams.get('noteBookId')
    const noteBookTitleFilter = searchParams.get('noteBookTitle')

    // Get members with note count
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select(`
        *,
        notes:notes(member_id)
      `)
      .order('display_name', { ascending: true })

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
        cover_r2_key,
        cover_url_expires_at,
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
    let books = booksData?.map(book => {
      const notes = book.notes as any[]
      const noteCount = notes?.length || 0

      // Get unique readers for filtering
      const readers = notes?.reduce((acc: any[], note: any) => {
        const member = note.members
        if (member && !acc.find(r => r.id === member.id)) {
          acc.push({
            id: member.id,
            display_name: member.display_name
          })
        }
        return acc
      }, []) || []

      // Get latest note for sorting
      const sortedNotes = notes?.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) || []
      const latestNote = sortedNotes[0]

      return {
        ...book,
        note_count: noteCount,
        latest_note_at: latestNote?.created_at || null,
        readers,
        notes: undefined,
        cover_r2_key: (book as any).cover_r2_key,
        cover_url_expires_at: (book as any).cover_url_expires_at,
      }
    })

    // Apply book type filter
    if (bookTypeFilter) {
      books = books?.filter(book => book.type === bookTypeFilter)
    }

    // Apply book reader filter (books where this member has notes)
    if (bookReaderFilter) {
      books = books?.filter(book =>
        book.readers?.some((r: any) => r.id === bookReaderFilter)
      )
    }

    // Apply title filter (per-word matching, case-insensitive)
    if (bookTitleFilter) {
      const words = bookTitleFilter.toLowerCase().split(/\s+/).filter(Boolean)
      books = books?.filter(book => {
        const title = (book.title || '').toLowerCase()
        return words.every(word => title.includes(word))
      })
    }

    // Refresh cover signed URLs if needed
    const booksWithFreshCovers = await Promise.all(
      (books ?? []).map(async b => {
        const freshUrl = await refreshBookCoverUrl(b as any)
        return { ...b, cover_url: freshUrl }
      })
    )
    books = booksWithFreshCovers

    // Sort by latest_note_at DESC (same as /api/books)
    const sortedBooks = books?.sort((a, b) => {
      if (!a.latest_note_at) return 1
      if (!b.latest_note_at) return -1
      return new Date(b.latest_note_at).getTime() - new Date(a.latest_note_at).getTime()
    })

    // Get notes with member and book info
    let { data: notesData, error: notesError } = await supabase
      .from('notes')
      .select(`
        *,
        members:member_id (display_name, wa_phone),
        books:book_id (title, author)
      `)
      .order('created_at', { ascending: false })

    if (notesError) throw notesError

    // Apply note member filter
    if (noteMemberFilter) {
      notesData = (notesData || []).filter((n: any) => n.member_id === noteMemberFilter)
    }

    // Apply note book filter
    if (noteBookFilter) {
      notesData = (notesData || []).filter((n: any) => n.book_id === noteBookFilter)
    }

    // Apply note book title filter (per-word matching, case-insensitive)
    if (noteBookTitleFilter) {
      const words = noteBookTitleFilter.toLowerCase().split(/\s+/).filter(Boolean)
      notesData = (notesData || []).filter((n: any) => {
        const title = (n.books?.title || '').toLowerCase()
        return words.every(word => title.includes(word))
      })
    }

    const noteIds = (notesData || []).map((n: any) => n.id)
    const attachments = await refreshAttachmentsForNotes(noteIds)
    const attachmentsByNoteId = attachments.reduce((acc: Record<string, any[]>, att) => {
      if (!acc[att.note_id]) acc[att.note_id] = []
      acc[att.note_id].push(att)
      return acc
    }, {})

    const notes = notesData?.map((n: any) => ({
      ...n,
      member_name: n.members?.display_name,
      book_title: n.books?.title,
      attachments: attachmentsByNoteId[n.id] || [],
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
