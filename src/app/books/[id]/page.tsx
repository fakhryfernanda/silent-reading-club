'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { Book, Note } from '@/lib/types'
import { timeAgo, avatarColor, initials } from '@/lib/utils'
import ImageCarousel from '@/components/ImageCarousel'

type BookDetail = {
  book: Book
  notes: (Note & { display_name: string; wa_phone: string })[]
}

const COLLAPSE_CHAR_LIMIT = 300

export default function BookPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<BookDetail | null>(null)
  const [activeReader, setActiveReader] = useState<string>('semua')
  const [loading, setLoading] = useState(true)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [carouselImages, setCarouselImages] = useState<string[]>([])
  const [carouselIndex, setCarouselIndex] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleNote = (noteId: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      if (next.has(noteId)) next.delete(noteId)
      else next.add(noteId)
      return next
    })
  }

  useEffect(() => {
    fetch(`/api/books/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [id])

  if (loading) return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '80px 28px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
      Memuat...
    </div>
  )

  if (!data?.book) return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '80px 28px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
      Buku tidak ditemukan.
    </div>
  )

  const { book, notes } = data

  // Unique readers
  const readers = Array.from(
    new Map(notes.map(n => [n.member_id, { id: n.member_id, display_name: n.display_name }])).values()
  )

  const filtered = activeReader === 'semua'
    ? notes
    : notes.filter(n => n.member_id === activeReader)

  const noteCountFor = (memberId: string) => notes.filter(n => n.member_id === memberId).length

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 28px', position: 'relative' }}>

      {/* Back */}
      <button
        onClick={() => router.push('/')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.08em',
          textTransform: 'uppercase', fontFamily: 'Lora, serif',
          padding: '28px 0 0', background: 'none', border: 'none', cursor: 'pointer',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--amber)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        ← Semua Buku
      </button>

      {/* Hero */}
      <div style={{ display: 'flex', gap: 36, padding: '32px 0 36px', borderBottom: '1px solid var(--border)', marginBottom: 48, alignItems: 'flex-start' }}>
        {/* Cover */}
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            style={{
              width: 100, minWidth: 100, borderRadius: 6,
              height: 'auto', display: 'block',
              boxShadow: '4px 6px 20px rgba(44,26,14,0.2)',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{
            width: 100, minWidth: 100, height: 148, borderRadius: 6,
            background: `linear-gradient(135deg, ${avatarColor(book.title)} 0%, var(--brown-mid) 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '4px 6px 20px rgba(44,26,14,0.2), inset -3px 0 8px rgba(0,0,0,0.15)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, background: 'rgba(0,0,0,0.15)', borderRadius: '6px 0 0 6px' }} />
            <span style={{ fontFamily: 'Lora, serif', fontSize: 36, fontWeight: 600, color: 'rgba(255,255,255,0.6)', zIndex: 1 }}>
              {initials(book.title)}
            </span>
          </div>
        )}

        {/* Meta */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Lora, serif', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 8 }}>
            Silent Reading Insights
          </div>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: 32, fontWeight: 600, color: 'var(--brown-dark)', lineHeight: 1.2, marginBottom: 6 }}>
            {book.title}
          </h1>
          <div style={{ fontSize: 17, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 20 }}>
            {book.author || 'Penulis tidak diketahui'}
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { num: book.reader_count, label: 'Pembaca' },
              { num: book.note_count, label: 'Catatan' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 600, color: 'var(--amber)' }}>{s.num}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontFamily: 'Lora, serif', fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Catatan per pembaca
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* Reader tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
        {/* Semua tab */}
        <button
          onClick={() => setActiveReader('semua')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 999,
            border: '1px solid var(--border)',
            background: activeReader === 'semua' ? 'var(--amber)' : 'var(--card-bg)',
            color: activeReader === 'semua' ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer', fontSize: 14, fontFamily: 'Crimson Pro, serif',
            transition: 'all 0.18s',
          }}
        >
          Semua
        </button>

        {/* Per reader */}
        {readers.map(r => (
          <button
            key={r.id}
            onClick={() => setActiveReader(r.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px 8px 10px', borderRadius: 999,
              border: '1px solid var(--border)',
              background: activeReader === r.id ? 'var(--amber)' : 'var(--card-bg)',
              color: activeReader === r.id ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 14, fontFamily: 'Crimson Pro, serif',
              transition: 'all 0.18s',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: '#fff',
              background: activeReader === r.id ? 'rgba(255,255,255,0.25)' : avatarColor(r.display_name),
            }}>
              {initials(r.display_name)}
            </div>
            {r.display_name}
            <span style={{ opacity: 0.7, fontSize: 13 }}>· {noteCountFor(r.id)}</span>
          </button>
        ))}
      </div>

      {/* Notes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 60 }}>
        {filtered.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '40px 0', textAlign: 'center' }}>
            Belum ada catatan.
          </p>
        ) : (
          filtered.map((note, i) => (
            <div
              key={note.id}
              className="animate-fade-up"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '22px 24px',
                animationDelay: `${i * 0.06}s`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, color: '#fff',
                    background: avatarColor(note.display_name),
                  }}>
                    {initials(note.display_name)}
                  </div>
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, color: 'var(--brown-dark)' }}>
                    {note.display_name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {note.sort_order && (
                    <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--brown-light)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 8px' }}>
                      #{note.sort_order}
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {timeAgo(note.created_at)}
                  </span>
                </div>
              </div>
              <div className="note-content" style={{ paddingLeft: 40 }}>
                {(() => {
                  const isExpanded = expandedNotes.has(note.id)
                  const shouldTruncate = note.content.length > COLLAPSE_CHAR_LIMIT
                  const displayContent = shouldTruncate && !isExpanded
                    ? note.content.slice(0, COLLAPSE_CHAR_LIMIT) + '...'
                    : note.content

                  return (
                    <>
                      <ReactMarkdown>{displayContent}</ReactMarkdown>
                      {shouldTruncate && (
                        <button
                          onClick={() => toggleNote(note.id)}
                          style={{
                            marginTop: 12,
                            padding: '6px 14px',
                            fontSize: 13,
                            fontFamily: 'Lora, serif',
                            color: 'var(--amber)',
                            background: 'none',
                            border: '1px solid var(--amber)',
                            borderRadius: 6,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--amber)'
                            e.currentTarget.style.color = '#fff'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'none'
                            e.currentTarget.style.color = 'var(--amber)'
                          }}
                        >
                          {isExpanded ? 'Tutup ▲' : 'Baca selengkapnya ▼'}
                        </button>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* Attachments */}
              {note.attachments && note.attachments.length > 0 && (
                <div style={{
                  paddingLeft: 40,
                  marginTop: 16,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, 120px)',
                  gap: 8,
                }}>
                  {note.attachments.map((att, attIndex) => (
                    <button
                      key={att.id}
                      onClick={() => {
                        const imageUrls = note.attachments!.map(a => a.signed_url!).filter(Boolean)
                        setCarouselImages(imageUrls)
                        setCarouselIndex(attIndex)
                        setCarouselOpen(true)
                      }}
                      style={{ display: 'block', width: 120, height: 120, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', transition: 'opacity 0.15s', cursor: 'pointer', background: 'none', padding: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      <img
                        src={att.signed_url ?? ''}
                        alt={att.file_name ?? 'attachment'}
                        style={{ width: 120, height: 120, display: 'block', objectFit: 'cover', objectPosition: 'center' }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 16, color: 'var(--brown-mid)' }}>
          "We read to know we are not alone."
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>— C.S. Lewis</div>
      </footer>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          padding: '10px 20px',
          fontSize: 14,
          fontFamily: 'Lora, serif',
          color: showBackToTop ? '#fff' : 'var(--amber)',
          background: showBackToTop ? 'var(--amber)' : 'var(--card-bg)',
          border: '1px solid var(--amber)',
          borderRadius: 999,
          cursor: 'pointer',
          transition: 'all 0.25s',
          opacity: showBackToTop ? 1 : 0,
          pointerEvents: showBackToTop ? 'auto' : 'none',
          boxShadow: showBackToTop ? '0 4px 12px rgba(44,26,14,0.15)' : 'none',
          zIndex: 100,
        }}
      >
        ↑ Kembali ke atas
      </button>

      {/* Image Carousel Modal */}
      {carouselOpen && (
        <ImageCarousel
          images={carouselImages}
          initialIndex={carouselIndex}
          onClose={() => setCarouselOpen(false)}
        />
      )}
    </div>
  )
}
