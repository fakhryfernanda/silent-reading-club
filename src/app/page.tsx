import { Book } from '@/lib/types'
import BookGrid from '@/components/BookGrid'
import { supabase } from '@/lib/db'

async function getBooks(): Promise<Book[]> {
  try {
    // Direct Supabase query instead of HTTP fetch
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
        note_count: noteCount,
        reader_count: readers.length,
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

    return sorted || []
  } catch (err) {
    console.error('Error fetching books:', err)
    return []
  }
}

export default async function HomePage() {
  const books = await getBooks()

  const totalNotes = books.reduce((sum, b) => sum + Number(b.note_count || 0), 0)
  const totalReaders = new Set(
    books.flatMap(b => (b.readers || []).map(r => r.id))
  ).size

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 28px' }}>

      <header style={{ padding: '48px 0 36px', borderBottom: '1px solid var(--border)', marginBottom: 48 }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 10 }}>
          Silent Reading Club
        </div>
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: 38, fontWeight: 600, color: 'var(--brown-dark)', lineHeight: 1.15, marginBottom: 8 }}>
          Catatan Bersama
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Kumpulan notes dari orang-orang yang suka baca dan berbagi.
        </p>
        <div style={{ display: 'flex', gap: 32, marginTop: 24 }}>
          {[
            { num: books.length, label: 'Buku' },
            { num: totalReaders, label: 'Pembaca' },
            { num: totalNotes, label: 'Catatan' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 600, color: 'var(--amber)' }}>{s.num}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontFamily: 'Lora, serif', fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Buku yang sedang dibaca
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <BookGrid books={books} />

      <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 16, color: 'var(--brown-mid)' }}>
          "We read to know we are not alone."
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>— C.S. Lewis</div>
      </footer>
    </div>
  )
}
