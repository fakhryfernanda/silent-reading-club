import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { refreshBookCoverUrl } from '@/lib/refreshCoverUrl'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const typeFilter = searchParams.get('type')
    const readerIdFilter = searchParams.get('readerId')
    const titleFilter = searchParams.get('title')

    // Get all books with their notes and readers
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select(`
        id,
        title,
        author,
        cover_url,
        cover_r2_key,
        cover_url_expires_at,
        type,
        created_at,
        notes (
          id,
          content,
          created_at,
          members:member_id (
            id,
            display_name,
            alias
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (booksError) throw booksError

    // Transform data to match the expected format
    let transformedBooks = books?.map(book => {
      const notes = book.notes as any[]
      const noteCount = notes?.length || 0

      // Get unique readers
      const readers = notes?.reduce((acc: any[], note: any) => {
        const member = note.members
        if (member && !acc.find(r => r.id === member.id)) {
          acc.push({
            id: member.id,
            display_name: member.display_name,
            alias: member.alias
          })
        }
        return acc
      }, []) || []

      // Get latest note
      const sortedNotes = notes?.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) || []
      const latestNote = sortedNotes[0]

      return {
        id: book.id,
        title: book.title,
        author: book.author,
        cover_url: book.cover_url,
        cover_r2_key: (book as any).cover_r2_key,
        cover_url_expires_at: (book as any).cover_url_expires_at,
        type: book.type,
        created_at: book.created_at,
        note_count: noteCount,
        reader_count: readers.length,
        latest_note: latestNote?.content || null,
        latest_note_by: latestNote?.members?.alias || latestNote?.members?.display_name || null,
        latest_note_at: latestNote?.created_at || null,
        readers: readers
      }
    })

    // Apply type filter
    if (typeFilter) {
      transformedBooks = transformedBooks?.filter(book => book.type === typeFilter)
    }

    // Apply reader filter (books where this member has notes)
    if (readerIdFilter) {
      transformedBooks = transformedBooks?.filter(book =>
        book.readers?.some((r: any) => r.id === readerIdFilter)
      )
    }

    // Apply title filter (per-word matching, case-insensitive)
    if (titleFilter) {
      const words = titleFilter.toLowerCase().split(/\s+/).filter(Boolean)
      transformedBooks = transformedBooks?.filter(book => {
        const title = (book.title || '').toLowerCase()
        return words.every(word => title.includes(word))
      })
    }

    // Sort by latest note date
    const sorted = transformedBooks?.sort((a, b) => {
      if (!a.latest_note_at) return 1
      if (!b.latest_note_at) return -1
      return new Date(b.latest_note_at).getTime() - new Date(a.latest_note_at).getTime()
    })

    // Refresh cover signed URLs if needed
    const withFreshCovers = await Promise.all(
      (sorted ?? []).map(async book => {
        const freshUrl = await refreshBookCoverUrl(book as any)
        return { ...book, cover_url: freshUrl }
      })
    )

    return NextResponse.json(withFreshCovers)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
