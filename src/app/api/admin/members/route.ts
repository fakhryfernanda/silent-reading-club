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
  const wa_phone = body.wa_phone?.trim()
  const display_name = body.display_name?.trim()

  if (!wa_phone || !display_name) {
    return NextResponse.json({ error: 'wa_phone dan display_name wajib diisi' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('members')
      .insert({ wa_phone, display_name })
      .select()
      .single()

    if (error) {
      // Check for duplicate key error
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Nomor WA sudah terdaftar' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
