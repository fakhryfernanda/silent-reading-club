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
  const display_name = body.display_name?.trim()
  const wa_phone = body.wa_phone?.trim()

  if (!display_name) {
    return NextResponse.json({ error: 'display_name wajib diisi' }, { status: 400 })
  }
  if (!wa_phone) {
    return NextResponse.json({ error: 'wa_phone wajib diisi' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('members')
      .update({ display_name, wa_phone })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 })
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Nomor WA sudah dipakai anggota lain' }, { status: 409 })
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
    // Delete all notes for this member first
    const { error: notesError } = await supabase
      .from('notes')
      .delete()
      .eq('member_id', params.id)

    if (notesError) throw notesError

    // Delete the member
    const { data, error: memberError } = await supabase
      .from('members')
      .delete()
      .eq('id', params.id)
      .select()

    if (memberError) throw memberError

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ id: params.id })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
