'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Book } from '@/lib/types'
import { timeAgo, avatarColor, initials, stripMarkdown } from '@/lib/utils'

export default function BookGrid({ typeFilter, readerFilter, titleFilter, isCoverMode }: { typeFilter?: string | null, readerFilter?: string | null, titleFilter?: string | null, isCoverMode?: boolean }) {
  const [allBooks, setAllBooks] = useState<Book[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const limit = isMobile ? 4 : 6

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

  // Reset to page 1 when switching between mobile/desktop
  useEffect(() => {
    setCurrentPage(1)
  }, [isMobile])

  // Client-side pagination
  const totalPages = Math.ceil(allBooks.length / limit)
  const startIndex = (currentPage - 1) * limit
  const endIndex = startIndex + limit
  const books = allBooks.slice(startIndex, endIndex)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      // Scroll to pagination area so it stays visible
      setTimeout(() => {
        const paginationEl = document.querySelector('[data-pagination]')
        if (paginationEl) {
          paginationEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }

  if (loading) {
    return (
      <p className="text-muted italic py-10 mb-[60px]">
        Memuat...
      </p>
    )
  }

  if (books.length === 0) {
    return (
      <p className="text-muted italic py-10 mb-[60px]">
        {typeFilter || readerFilter || titleFilter ? 'Tidak ada buku yang sesuai dengan filter.' : 'Belum ada buku. Kirim notes pertamamu via WhatsApp!'}
      </p>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5 mb-[60px]">
        {books.map((book, i) => (
          <Link key={book.id} href={`/books/${book.id}`} className="no-underline flex flex-col">
            <div
              key={isCoverMode ? 'cover' : 'info'}
              className={`animate-fade-up bg-cardBg border border-accent rounded-[10px] p-[22px] cursor-pointer relative overflow-hidden h-full ${
                !isCoverMode ? 'hover:-translate-y-[3px] hover:shadow-cardHover hover:border-brown-dark' : ''
              } transition-all duration-200`}
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              {isCoverMode ? (
                /* Cover mode */
                <>
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full max-h-[220px] object-contain rounded-md mb-[14px]"
                    />
                  ) : (
                    <div className="w-full h-40 bg-placeholder rounded-md flex items-center justify-center mb-[14px]">
                      <span className="font-lora text-sm text-muted italic">
                        No Cover
                      </span>
                    </div>
                  )}
                  <div className="font-lora text-[17px] font-semibold text-brown-dark leading-tight mb-1 line-clamp-2 text-center">
                    {book.title}
                  </div>
                  <div className="text-sm text-muted italic text-center">
                    {book.author || 'Penulis tidak diketahui'}
                  </div>
                </>
              ) : (
                /* Info mode (original layout) */
                <>
                  {/* Accent bar - full height */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-accent to-brown-light rounded-l-[10px]" />

                  <div className="flex flex-col h-full min-h-[260px] pl-0 justify-between">
                    {/* TOP SECTION: Book Info */}
                    <div className="flex-1">
                      <div className="font-lora text-[17px] font-semibold text-brown-dark leading-tight mb-1 line-clamp-2">
                        {book.title}
                      </div>
                      <div className="text-sm text-muted italic mb-1.5">
                        {book.author || 'Penulis tidak diketahui'}
                      </div>
                      {book.type && (
                        <span className="font-lora text-[10px] text-accent border border-accent rounded-full px-[7px] py-0.5 whitespace-nowrap inline-block mb-4">
                          {book.type}
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {(book.readers || []).slice(0, 4).map((r, ri) => (
                            <div 
                              key={r.id} 
                              className="w-[30px] h-[30px] rounded-full border-2 border-cardBg flex items-center justify-center text-[11px] font-semibold text-white leading-none"
                              style={{
                                background: avatarColor((r as any).alias || r.display_name),
                                marginLeft: ri === 0 ? 0 : -6,
                              }}
                            >
                              {(r as any).alias ? initials((r as any).alias) : (r.display_name ? initials(r.display_name) : '?')}
                            </div>
                          ))}
                        </div>
                        <span className="text-[13px] text-muted">
                          {book.reader_count} pembaca · {book.note_count} catatan
                        </span>
                      </div>
                    </div>

                    {/* BOTTOM SECTION: Note Excerpt (always shown) */}
                    <div className="pt-[14px] border-t border-bookBorder">
                      {book.latest_note ? (
                        <>
                          <div className="text-sm text-muted italic leading-relaxed line-clamp-2">
                            "{stripMarkdown(book.latest_note)}"
                          </div>
                          <div className="text-xs text-accent mt-1.5">
                            &mdash; {book.latest_note_by || 'Anonim'}{book.latest_note_at ? `, ${timeAgo(book.latest_note_at)}` : ''}
                          </div>
                        </>
                      ) : (
                        <div className="text-[13px] text-muted italic leading-relaxed">
                          Belum ada catatan dari buku ini
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination UI */}
      {totalPages > 1 && (
        <div data-pagination>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`font-lora text-sm bg-transparent border-none px-4 py-2 transition-colors duration-200 ${
                currentPage === 1 
                  ? 'text-muted cursor-not-allowed opacity-50' 
                  : 'text-brown-dark cursor-pointer hover:text-accent'
              }`}
            >
              ← Sebelumnya
            </button>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`font-lora text-sm bg-transparent border-none px-4 py-2 transition-colors duration-200 ${
                currentPage === totalPages 
                  ? 'text-muted cursor-not-allowed opacity-50' 
                  : 'text-brown-dark cursor-pointer hover:text-accent'
              }`}
            >
              Selanjutnya →
            </button>
          </div>

          {/* Page number buttons */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`font-lora text-[13px] w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-all duration-150 ${
                  page === currentPage
                    ? 'border-none bg-accent text-white'
                    : 'border border-bookBorder bg-cardBg text-muted hover:text-accent hover:border-accent'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
