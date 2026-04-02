import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get book with notes and member details
    const { data: book, error: bookError } = await supabase
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
          raw_message,
          sort_order,
          created_at,
          member_id,
          member:members (
            display_name,
            wa_phone
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (bookError) {
      if (bookError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 })
      }
      throw bookError
    }

    const notes = book.notes as any[]
    
    // Calculate counts
    const noteCount = notes?.length || 0
    const uniqueReaders = new Set(notes?.map((n: any) => n.member_id))
    const readerCount = uniqueReaders.size

    // Transform notes
    const transformedNotes = notes
      ?.map((note: any) => ({
        id: note.id,
        content: note.content,
        raw_message: note.raw_message,
        sort_order: note.sort_order,
        created_at: note.created_at,
        member_id: note.member_id,
        display_name: note.member?.display_name,
        wa_phone: note.member?.wa_phone
      }))
      .sort((a: any, b: any) => {
        // Sort by sort_order first (nulls last), then by created_at
        if (a.sort_order === null && b.sort_order === null) {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        }
        if (a.sort_order === null) return 1
        if (b.sort_order === null) return -1
        return a.sort_order - b.sort_order
      }) || []

    return NextResponse.json({
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        cover_url: book.cover_url,
        type: book.type,
        created_at: book.created_at,
        note_count: noteCount.toString(),
        reader_count: readerCount.toString()
      },
      notes: transformedNotes
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
