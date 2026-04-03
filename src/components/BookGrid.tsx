'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Book } from '@/lib/types'
import { timeAgo, avatarColor, initials, stripMarkdown } from '@/lib/utils'

export default function BookGrid({ typeFilter, readerFilter, titleFilter }: { typeFilter?: string | null, readerFilter?: string | null, titleFilter?: string | null }) {
  const [allBooks, setAllBooks] = useState<Book[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const limit = 6

  useEffect(() => {
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    if (readerFilter) params.set('readerId', readerFilter)
    if (titleFilter) params.set('title', titleFilter)

    const url = `/api/books${params.toString() ? '?' + params.toString() : ''}`

    setLoading(true)
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setAllBooks(data)
        setCurrentPage(1) // Reset to page 1 when filters change
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching books:', err)
        setLoading(false)
      })
  }, [typeFilter, readerFilter, titleFilter])

  // Client-side pagination
  const totalPages = Math.ceil(allBooks.length / limit)
  const startIndex = (currentPage - 1) * limit
  const endIndex = startIndex + limit
  const books = allBooks.slice(startIndex, endIndex)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  if (loading) {
    return (
      <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '40px 0', marginBottom: 60 }}>
        Memuat...
      </p>
    )
  }

  if (books.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '40px 0', marginBottom: 60 }}>
        {typeFilter || readerFilter || titleFilter ? 'Tidak ada buku yang sesuai dengan filter.' : 'Belum ada buku. Kirim notes pertamamu via WhatsApp!'}
      </p>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20, marginBottom: 60 }}>
        {books.map((book, i) => (
          <Link key={book.id} href={`/books/${book.id}`} style={{ textDecoration: 'none' }}>
            <div
              className="animate-fade-up book-card"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 22,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                animationDelay: `${i * 0.07}s`,
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'translateY(-3px)'
                el.style.boxShadow = '0 8px 28px rgba(44,26,14,0.1)'
                el.style.borderColor = 'var(--brown-light)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = ''
                el.style.boxShadow = ''
                el.style.borderColor = ''
              }}
            >
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(to bottom, var(--amber), var(--brown-light))', borderRadius: '10px 0 0 10px' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <div style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 600, color: 'var(--brown-dark)', lineHeight: 1.3 }}>
                  {book.title}
                </div>
                {book.type && (
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 10, color: 'var(--amber)', border: '1px solid var(--amber)', borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>
                    {book.type}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 16 }}>
                {book.author || 'Penulis tidak diketahui'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ display: 'flex' }}>
                  {(book.readers || []).slice(0, 4).map((r, ri) => (
                    <div key={r.id} style={{
                      width: 26, height: 26, borderRadius: '50%',
                      border: '2px solid var(--card-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 600, color: '#fff',
                      background: avatarColor(r.display_name),
                      marginLeft: ri === 0 ? 0 : -6,
                    }}>
                      {r.display_name ? initials(r.display_name) : '?'}
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {book.reader_count} pembaca · {book.note_count} catatan
                </span>
              </div>

              {book.latest_note && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{
                    fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic',
                    lineHeight: 1.5, display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    "{stripMarkdown(book.latest_note)}"
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 6 }}>
                    &mdash; {book.latest_note_by || 'Anonim'}{book.latest_note_at ? `, ${timeAgo(book.latest_note_at)}` : ''}
                  </div>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination UI */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          marginBottom: 60,
          paddingTop: 24,
          borderTop: '1px solid var(--border)'
        }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              fontFamily: 'Lora, serif',
              fontSize: 14,
              color: currentPage === 1 ? 'var(--text-muted)' : 'var(--brown-dark)',
              background: 'none',
              border: 'none',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              padding: '8px 16px',
              opacity: currentPage === 1 ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => {
              if (currentPage !== 1) {
                (e.target as HTMLButtonElement).style.color = 'var(--amber)'
              }
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.color = currentPage === 1 ? 'var(--text-muted)' : 'var(--brown-dark)'
            }}
          >
            ← Sebelumnya
          </button>

          <span style={{
            fontFamily: 'Lora, serif',
            fontSize: 14,
            color: 'var(--text-muted)',
          }}>
            Halaman <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{currentPage}</span> dari {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              fontFamily: 'Lora, serif',
              fontSize: 14,
              color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--brown-dark)',
              background: 'none',
              border: 'none',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              padding: '8px 16px',
              opacity: currentPage === totalPages ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => {
              if (currentPage !== totalPages) {
                (e.target as HTMLButtonElement).style.color = 'var(--amber)'
              }
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.color = currentPage === totalPages ? 'var(--text-muted)' : 'var(--brown-dark)'
            }}
          >
            Selanjutnya →
          </button>
        </div>
      )}
    </div>
  )
}
