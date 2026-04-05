import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { wa_phone, display_name, book_title, book_author, content, raw_message } = body

    if (!wa_phone || !book_title || !content) {
      return NextResponse.json(
        { error: 'wa_phone, book_title, and content are required' },
        { status: 400 }
      )
    }

    // Upsert member
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .upsert(
        { wa_phone, display_name: display_name || 'Anggota' },
        { onConflict: 'wa_phone', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (memberError) throw memberError
    const memberId = memberData.id

    // Check if book exists (case-insensitive)
    const { data: existingBooks, error: searchError } = await supabase
      .from('books')
      .select('id')
      .ilike('title', book_title)
      .limit(1)

    if (searchError) throw searchError

    let bookId: string

    if (existingBooks && existingBooks.length > 0) {
      bookId = existingBooks[0].id
    } else {
      // Insert new book
      const { data: newBook, error: bookError } = await supabase
        .from('books')
        .insert({ title: book_title, author: book_author || null })
        .select('id')
        .single()

      if (bookError) throw bookError
      bookId = newBook.id
    }

    // Get max sort_order for this book
    const { data: maxOrderData } = await supabase
      .from('notes')
      .select('sort_order')
      .eq('book_id', bookId)
      .order('sort_order', { ascending: false, nullsFirst: false })
      .limit(1)

    const nextSortOrder = (maxOrderData && maxOrderData[0]?.sort_order) 
      ? maxOrderData[0].sort_order + 1 
      : 1

    // Insert note
    const { data: noteData, error: noteError } = await supabase
      .from('notes')
      .insert({
        member_id: memberId,
        book_id: bookId,
        content,
        raw_message: raw_message || null,
        sort_order: nextSortOrder
      })
      .select('id, created_at, sort_order')
      .single()

    if (noteError) throw noteError

    return NextResponse.json({
      success: true,
      note_id: noteData.id,
      created_at: noteData.created_at,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
