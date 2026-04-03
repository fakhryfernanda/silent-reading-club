import BookGrid from '@/components/BookGrid'
import { supabase } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getStats() {
  try {
    const { data: books, error } = await supabase
      .from('books')
      .select(`
        id,
        notes (
          id,
          members:member_id (
            id
          )
        )
      `)

    if (error) throw error

    const totalBooks = books?.length || 0
    const totalNotes = books?.reduce((sum, book) => sum + (book.notes?.length || 0), 0) || 0
    const allReaders = new Set(
      books?.flatMap(book => 
        (book.notes || [])
          .map((note: any) => note.members?.id)
          .filter(Boolean)
      ) || []
    )

    return {
      totalBooks,
      totalNotes,
      totalReaders: allReaders.size
    }
  } catch (err) {
    console.error('Error fetching stats:', err)
    return {
      totalBooks: 0,
      totalNotes: 0,
      totalReaders: 0
    }
  }
}

export default async function HomePage() {
  const stats = await getStats()

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
            { num: stats.totalBooks, label: 'Buku' },
            { num: stats.totalReaders, label: 'Pembaca' },
            { num: stats.totalNotes, label: 'Catatan' },
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

      <BookGrid />

      <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 16, color: 'var(--brown-mid)' }}>
          "We read to know we are not alone."
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>— C.S. Lewis</div>
      </footer>
    </div>
  )
}
