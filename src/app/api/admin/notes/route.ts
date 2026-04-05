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
  const member_id = body.member_id?.trim()
  const book_id = body.book_id?.trim()
  const content = body.content?.trim()
  const raw_message = body.raw_message?.trim() || null
  const sort_order_raw = body.sort_order

  if (!member_id || !book_id || !content) {
    return NextResponse.json({ error: 'member_id, book_id, dan content wajib diisi' }, { status: 400 })
  }

  try {
    // Determine sort_order
    let sort_order: number

    if (sort_order_raw !== undefined && sort_order_raw !== null && sort_order_raw !== '') {
      // User provide custom sort_order
      sort_order = parseInt(sort_order_raw)
      if (isNaN(sort_order) || sort_order < 1) {
        return NextResponse.json({ error: 'Sort order harus angka >= 1' }, { status: 400 })
      }

      // Reorder existing notes to make room
      const { data: existingNotes } = await supabase
        .from('notes')
        .select('id, sort_order')
        .eq('book_id', book_id)
        .order('sort_order', { ascending: true })

      if (existingNotes) {
        for (const note of existingNotes) {
          if (note.sort_order >= sort_order) {
            const { error } = await supabase
              .from('notes')
              .update({ sort_order: note.sort_order + 1 })
              .eq('id', note.id)

            if (error) {
              console.error('Failed to reorder during insert:', error)
              return NextResponse.json({ error: 'Gagal reorder notes' }, { status: 500 })
            }
          }
        }
      }
    } else {
      // Auto-increment: get max sort_order for this book
      const { data: maxOrderData } = await supabase
        .from('notes')
        .select('sort_order')
        .eq('book_id', book_id)
        .order('sort_order', { ascending: false, nullsFirst: false })
        .limit(1)

      sort_order = (maxOrderData && maxOrderData[0]?.sort_order)
        ? maxOrderData[0].sort_order + 1
        : 1
    }

    // Insert note
    const { data, error } = await supabase
      .from('notes')
      .insert({
        member_id,
        book_id,
        content,
        raw_message,
        sort_order
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
