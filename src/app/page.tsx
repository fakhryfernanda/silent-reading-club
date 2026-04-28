'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import BookGrid from '@/components/BookGrid'
import BookFilters from '@/components/BookFilters'

type Stats = {
  totalBooks: number
  totalJournals: number
  totalArticles: number
  totalNotes: number
  totalReaders: number
}

function HomePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [stats, setStats] = useState<Stats | null>(null)
  const [availableTypes, setAvailableTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [isCoverMode, setIsCoverMode] = useState(true)

  const selectedType = searchParams.get('type')
  const selectedTitle = searchParams.get('title')

  useEffect(() => {
    // Fetch stats and members
    fetch('/api/books')
      .then(res => res.json())
      .then(books => {
        const totalBooks = books.filter((b: any) => !['Jurnal', 'Artikel'].includes(b.type)).length
        const totalJournals = books.filter((b: any) => b.type === 'Jurnal').length
        const totalArticles = books.filter((b: any) => b.type === 'Artikel').length
        const totalNotes = books.reduce((sum: number, book: any) => sum + book.note_count, 0)
        const allReaders = new Set(
          books.flatMap((book: any) =>
            (book.readers || []).map((r: any) => r.id)
          )
        )

        setStats({
          totalBooks,
          totalJournals,
          totalArticles,
          totalNotes,
          totalReaders: allReaders.size
        })

        // Extract unique book types
        const types = [...new Set(
          books
            .map((book: any) => book.type)
            .filter((type: string | null) => type != null && type !== '')
        )] as string[]
        setAvailableTypes(types)

        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching stats:', err)
        setStats({ totalBooks: 0, totalJournals: 0, totalArticles: 0, totalNotes: 0, totalReaders: 0 })
        setLoading(false)
      })
  }, [])

  const handleTypeChange = (type: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (type) {
      params.set('type', type)
    } else {
      params.delete('type')
    }
    router.push(`?${params.toString()}`)
  }

  const handleTitleChange = (title: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (title) {
      params.set('title', title)
    } else {
      params.delete('title')
    }
    router.push(`?${params.toString()}`)
  }

  const handleReset = () => {
    router.push('/')
  }

  if (loading || !stats) {
    return (
      <div className="max-w-[860px] mx-auto px-7">
        <p className="text-muted italic py-10">
          Memuat...
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-[860px] mx-auto px-7">

      <header className="pt-2 pb-6 md:pt-4 md:pb-6 border-b border-bookBorder mb-4 md:mb-6">
        <h1 className="font-lora text-4xl md:text-[52px] font-semibold text-brown-dark leading-tight mb-3">
          Silent Reading Insights
        </h1>
        <p className="text-lg text-muted italic font-lora">
          Mengubah literasi menjadi inspirasi
        </p>
        <div className="flex gap-8 mt-6">
          {[
            { num: stats.totalBooks, label: 'Buku' },
            { num: stats.totalJournals, label: 'Jurnal' },
            { num: stats.totalArticles, label: 'Artikel' },
            { num: stats.totalReaders, label: 'Pembaca' },
            { num: stats.totalNotes, label: 'Catatan' },
          ].map(s => (
            <div key={s.label} className="flex flex-col gap-0.5 items-center">
              <span className="font-lora text-[22px] font-semibold text-accent text-center">{s.num}</span>
              <span className="text-[13px] text-muted tracking-wide text-center">{s.label}</span>
            </div>
          ))}
        </div>
      </header>

      <BookFilters
        types={availableTypes}
        selectedType={selectedType}
        selectedTitle={selectedTitle}
        onTypeChange={handleTypeChange}
        onTitleChange={handleTitleChange}
        onReset={handleReset}
        isCoverMode={isCoverMode}
        onCoverModeChange={() => setIsCoverMode(prev => !prev)}
      />

      <BookGrid typeFilter={selectedType} readerFilter={null} titleFilter={selectedTitle} isCoverMode={isCoverMode} />

      <footer className="border-t border-bookBorder py-7 text-center">
        <div className="font-lora italic text-base text-brown-mid">
          "We read to know we are not alone."
        </div>
        <div className="text-[13px] text-muted mt-1.5">— C.S. Lewis</div>
      </footer>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="max-w-[860px] mx-auto px-7">
        <p className="text-muted italic py-10">
          Memuat...
        </p>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
