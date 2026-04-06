'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import BookGrid from '@/components/BookGrid'
import BookFilters from '@/components/BookFilters'

type Stats = {
  totalBooks: number
  totalNotes: number
  totalReaders: number
}

type Member = {
  id: string
  display_name: string
  alias: string | null
}

function HomePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [stats, setStats] = useState<Stats | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [availableTypes, setAvailableTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const selectedType = searchParams.get('type')
  const selectedReader = searchParams.get('reader')
  const selectedTitle = searchParams.get('title')

  useEffect(() => {
    // Fetch stats and members
    fetch('/api/books')
      .then(res => res.json())
      .then(books => {
        const totalBooks = books.length
        const totalNotes = books.reduce((sum: number, book: any) => sum + book.note_count, 0)
        const allReaders = new Set(
          books.flatMap((book: any) => 
            (book.readers || []).map((r: any) => r.id)
          )
        )
        
        setStats({
          totalBooks,
          totalNotes,
          totalReaders: allReaders.size
        })

        // Extract unique members from books
        const memberMap = new Map<string, Member>()
        books.forEach((book: any) => {
          (book.readers || []).forEach((reader: any) => {
            if (!memberMap.has(reader.id)) {
              memberMap.set(reader.id, {
                id: reader.id,
                display_name: reader.display_name,
                alias: reader.alias || null
              })
            }
          })
        })
        setMembers(Array.from(memberMap.values()).sort((a, b) =>
          a.display_name.localeCompare(b.display_name)
        ))

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
        setStats({ totalBooks: 0, totalNotes: 0, totalReaders: 0 })
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

  const handleReaderChange = (readerId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (readerId) {
      params.set('reader', readerId)
    } else {
      params.delete('reader')
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
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 28px' }}>
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '40px 0' }}>
          Memuat...
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 28px' }}>

      <header style={{ padding: '48px 0 32px', borderBottom: '1px solid var(--border)', marginBottom: 32 }} className="homepage-header">
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: 52, fontWeight: 600, color: 'var(--brown-dark)', lineHeight: 1.1, marginBottom: 12 }} className="homepage-heading">
          Silent Reading Insights
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', fontStyle: 'italic', fontFamily: 'Lora, serif' }}>
          Mengubah literasi menjadi inspirasi
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

      <BookFilters
        types={availableTypes}
        selectedType={selectedType}
        selectedReader={selectedReader}
        selectedTitle={selectedTitle}
        members={members}
        onTypeChange={handleTypeChange}
        onReaderChange={handleReaderChange}
        onTitleChange={handleTitleChange}
        onReset={handleReset}
      />

      <BookGrid typeFilter={selectedType} readerFilter={selectedReader} titleFilter={selectedTitle} />

      <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 16, color: 'var(--brown-mid)' }}>
          "We read to know we are not alone."
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>— C.S. Lewis</div>
      </footer>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 28px' }}>
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '40px 0' }}>
          Memuat...
        </p>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
