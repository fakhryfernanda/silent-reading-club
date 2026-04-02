export type Member = {
  id: string
  wa_phone: string
  display_name: string
  created_at: string
}

export type Book = {
  id: string
  title: string
  author: string | null
  cover_url: string | null
  type: string | null
  created_at: string
  note_count?: number
  reader_count?: number
  readers?: Member[]
  latest_note?: string
  latest_note_by?: string
  latest_note_at?: string
}

export type Note = {
  id: string
  member_id: string
  book_id: string
  content: string
  raw_message: string | null
  sort_order: number
  created_at: string
  member?: Member
}
