'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { visit } from 'unist-util-visit'
import remarkBreaks from 'remark-breaks'
import { Book, Note } from '@/lib/types'
import { timeAgo, avatarColor, initials } from '@/lib/utils'
import ImageCarousel from '@/components/ImageCarousel'

type BookDetail = {
  book: Book
  notes: (Note & { display_name: string; wa_phone: string })[]
}

const COLLAPSE_CHAR_LIMIT = 300

function remarkAsteriskBold() {
  return (tree: any, file: any) => {
    const src = String(file)
    visit(tree, 'emphasis', (node: any) => {
      if (node.position && src[node.position.start.offset] === '*') {
        node.type = 'strong'
      }
    })
  }
}

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
  const [fontSizeLevel, setFontSizeLevel] = useState<'A' | 'A+' | 'A++'>('A')

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

  useEffect(() => {
    if (data?.book) {
      document.title = `${data.book.title} — Silent Reading Club`
    }
  }, [data])

  if (loading) return (
    <div className="max-w-[860px] mx-auto px-7 py-20 text-muted italic">
      Memuat...
    </div>
  )

  if (!data?.book) return (
    <div className="max-w-[860px] mx-auto px-7 py-20 text-muted italic">
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

  const baseFontSize = 16
  const fontSize = baseFontSize + (fontSizeLevel === 'A+' ? 2 : fontSizeLevel === 'A++' ? 4 : 0)

  return (
    <div className="max-w-[860px] mx-auto px-7 relative">

      {/* Override prose font sizes so they inherit from parent */}
      <style>{`
        .note-content p,
        .note-content li,
        .note-content blockquote,
        .note-content td,
        .note-content th,
        .note-content figcaption {
          font-size: inherit !important;
        }
      `}</style>

      {/* Back */}
      <button
        onClick={() => router.push('/')}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted tracking-wider uppercase font-lora pt-7 bg-transparent border-none cursor-pointer transition-colors duration-150 hover:text-accent"
      >
        ← Semua Buku
      </button>

      {/* Hero */}
      <div className="flex gap-9 py-4 pb-7 mb-8 items-start">
        {/* Cover */}
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-[100px] min-w-[100px] rounded-md h-auto block shadow-[4px_6px_20px_rgba(44,26,14,0.2)] object-cover"
          />
        ) : (
          <div 
            className="w-[100px] min-w-[100px] h-[148px] rounded-md flex items-center justify-center shadow-[4px_6px_20px_rgba(44,26,14,0.2),inset_-3px_0_8px_rgba(0,0,0,0.15)] relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${avatarColor(book.title)} 0%, #6B3F1F 100%)` }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/15 rounded-l-md" />
            <span className="font-lora text-4xl font-semibold text-white/60 z-[1]">
              {initials(book.title)}
            </span>
          </div>
        )}

        {/* Meta */}
        <div className="flex-1">
          <div className="font-lora text-[11px] tracking-[0.2em] uppercase text-accent mb-2">
            Silent Reading Insights
          </div>
          <h1 className="font-lora text-[32px] font-semibold text-brown-dark leading-tight mb-1.5">
            {book.title}
          </h1>
          <div className="text-[17px] text-muted italic mb-5">
            {book.author || 'Penulis tidak diketahui'}
          </div>
          <div className="flex gap-6">
            {[
              { num: book.reader_count, label: 'Pembaca' },
              { num: book.note_count, label: 'Catatan' },
            ].map(s => (
              <div key={s.label} className="flex flex-col gap-0.5">
                <span className="font-lora text-xl font-semibold text-accent">{s.num}</span>
                <span className="text-xs text-muted tracking-wide">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section title */}
      <div className="flex items-center gap-3 mb-6">
        <span className="font-lora text-[13px] tracking-widest uppercase text-muted whitespace-nowrap">
          Catatan per pembaca
        </span>
        <div className="flex-1 h-px bg-bookBorder" />
        <div className="flex gap-1 items-center">
          {(['A', 'A+', 'A++'] as const).map(size => (
            <button
              key={size}
              onClick={() => setFontSizeLevel(size)}
              className={`font-lora text-[11px] px-2 py-0.5 rounded cursor-pointer transition-all duration-150 ${
                fontSizeLevel === size
                  ? 'bg-accent text-white border-none'
                  : 'bg-cardBg text-muted border border-bookBorder'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Reader tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {/* Semua tab */}
        <button
          onClick={() => setActiveReader('semua')}
          className={`flex items-center gap-2 py-2 px-4 rounded-full border border-bookBorder cursor-pointer text-sm font-crimson transition-all duration-[180ms] ${
            activeReader === 'semua' ? 'bg-accent text-white' : 'bg-cardBg text-muted'
          }`}
        >
          Semua
        </button>

        {/* Per reader */}
        {readers.map(r => (
          <button
            key={r.id}
            onClick={() => setActiveReader(r.id)}
            className={`flex items-center gap-2 py-2 pr-4 pl-2.5 rounded-full border border-bookBorder cursor-pointer text-sm font-crimson transition-all duration-[180ms] ${
              activeReader === r.id ? 'bg-accent text-white' : 'bg-cardBg text-muted'
            }`}
          >
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
              style={{ background: activeReader === r.id ? 'rgba(255,255,255,0.25)' : avatarColor(r.display_name) }}
            >
              {initials(r.display_name)}
            </div>
            {r.display_name}
            <span className="opacity-70 text-[13px]">· {noteCountFor(r.id)}</span>
          </button>
        ))}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-4 mb-15">
        {filtered.length === 0 ? (
          <p className="text-muted italic py-10 text-center">
            Belum ada catatan.
          </p>
        ) : (
          filtered.map((note, i) => (
            <div
              key={note.id}
              className="animate-fade-up bg-cardBg border border-bookBorder rounded-[10px] p-[22px_24px]"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-xs font-semibold text-white"
                    style={{ background: avatarColor(note.display_name) }}
                  >
                    {initials(note.display_name)}
                  </div>
                  <span className="font-lora text-[15px] font-semibold text-brown-dark">
                    {note.display_name}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  {note.sort_order && (
                    <span className="font-lora text-[11px] text-brown-light border border-bookBorder rounded-full py-px px-2">
                      #{note.sort_order}
                    </span>
                  )}
                  <span className="text-[13px] text-muted">
                    {timeAgo(note.created_at)}
                  </span>
                </div>
              </div>
              <div className="note-content" style={{ fontSize: `${fontSize}px` }}>
                {(() => {
                  const isExpanded = expandedNotes.has(note.id)
                  const shouldTruncate = note.content.length > COLLAPSE_CHAR_LIMIT
                  const displayContent = shouldTruncate && !isExpanded
                    ? note.content.slice(0, COLLAPSE_CHAR_LIMIT) + '...'
                    : note.content

                  return (
                    <>
                      <ReactMarkdown remarkPlugins={[remarkAsteriskBold, remarkBreaks]}>{displayContent}</ReactMarkdown>
                      {shouldTruncate && (
                        <button
                          onClick={() => toggleNote(note.id)}
                          className="mt-3 py-1.5 px-3.5 text-[13px] font-lora text-accent bg-transparent border border-accent rounded-md cursor-pointer transition-all duration-150 hover:bg-accent hover:text-white"
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
                <div className="mt-4 grid grid-cols-[repeat(auto-fill,120px)] gap-2">
                  {note.attachments.map((att, attIndex) => (
                    <button
                      key={att.id}
                      onClick={() => {
                        const imageUrls = note.attachments!.map(a => a.signed_url!).filter(Boolean)
                        setCarouselImages(imageUrls)
                        setCarouselIndex(attIndex)
                        setCarouselOpen(true)
                      }}
                      className="block w-[120px] h-[120px] rounded-md overflow-hidden border border-bookBorder transition-opacity duration-150 cursor-pointer bg-transparent p-0 hover:opacity-80"
                    >
                      <img
                        src={att.signed_url ?? ''}
                        alt={att.file_name ?? 'attachment'}
                        className="w-[120px] h-[120px] block object-cover object-center"
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
      <footer className="border-t border-bookBorder py-7 text-center">
        <div className="font-lora italic text-base text-brown-mid">
          "We read to know we are not alone."
        </div>
        <div className="text-[13px] text-muted mt-1.5">— C.S. Lewis</div>
      </footer>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 py-2.5 px-5 text-sm font-lora border border-accent rounded-full cursor-pointer transition-all duration-[250ms] z-[100] ${
          showBackToTop ? 'text-white bg-accent shadow-[0_4px_12px_rgba(44,26,14,0.15)]' : 'text-accent bg-cardBg shadow-none'
        }`}
        style={{
          opacity: showBackToTop ? 1 : 0,
          pointerEvents: showBackToTop ? 'auto' : 'none',
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
