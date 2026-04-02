import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET() {
  try {
    // Get all books with their notes and readers
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select(`
        id,
        title,
        author,
        cover_url,
        type,
        created_at,
        notes (
          id,
          content,
          created_at,
          member:members (
            id,
            display_name
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (booksError) throw booksError

    // Transform data to match the expected format
    const transformedBooks = books?.map(book => {
      const notes = book.notes as any[]
      const noteCount = notes?.length || 0
      
      // Get unique readers
      const readers = notes?.reduce((acc: any[], note: any) => {
        const member = note.member
        if (member && !acc.find(r => r.id === member.id)) {
          acc.push({
            id: member.id,
            display_name: member.display_name
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
        type: book.type,
        created_at: book.created_at,
        note_count: noteCount.toString(),
        reader_count: readers.length.toString(),
        latest_note: latestNote?.content || null,
        latest_note_by: latestNote?.member?.display_name || null,
        latest_note_at: latestNote?.created_at || null,
        readers: readers
      }
    })

    // Sort by latest note date
    const sorted = transformedBooks?.sort((a, b) => {
      if (!a.latest_note_at) return 1
      if (!b.latest_note_at) return -1
      return new Date(b.latest_note_at).getTime() - new Date(a.latest_note_at).getTime()
    })

    return NextResponse.json(sorted)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
