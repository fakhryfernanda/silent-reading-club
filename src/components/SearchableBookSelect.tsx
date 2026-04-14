'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

type BookOption = {
  id: string
  title: string
}

interface SearchableBookSelectProps {
  books: BookOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyLabel?: string
  // Optional: filter books by user's reading history
  selectedMemberId?: string
  allNotes?: Array<{ member_id: string; book_id: string }>
}

export default function SearchableBookSelect({
  books,
  value,
  onChange,
  placeholder = 'Cari buku...',
  emptyLabel = 'Tidak ada buku ditemukan',
  selectedMemberId,
  allNotes,
}: SearchableBookSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [readMode, setReadMode] = useState<'continue' | 'new'>('continue')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Show toggle only when member is selected
  const showFilterToggle = !!selectedMemberId

  // Find selected book title
  const selectedBook = books.find(b => b.id === value)
  const displayValue = selectedBook ? selectedBook.title : ''

  // Compute which books the selected user has read (memoized)
  const booksUserHasRead = useMemo(() => {
    if (!selectedMemberId || !allNotes) return new Set<string>()
    return new Set(
      allNotes
        .filter(n => n.member_id === selectedMemberId)
        .map(n => n.book_id)
    )
  }, [selectedMemberId, allNotes])

  // Filter books based on read mode (memoized)
  const availableBooks = useMemo(() => {
    if (!showFilterToggle) return books
    const isContinueReading = readMode === 'continue'
    return books.filter(b =>
      isContinueReading
        ? booksUserHasRead.has(b.id)
        : !booksUserHasRead.has(b.id)
    )
  }, [books, booksUserHasRead, readMode, showFilterToggle])

  // Reset book selection when member or mode changes
  useEffect(() => {
    if (value && !availableBooks.some(b => b.id === value)) {
      onChange('')
    }
  }, [availableBooks, value, onChange])

  // Filter books based on search query (per-word, case-insensitive matching)
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return availableBooks

    const queryWords = searchQuery.toLowerCase().trim().split(/\s+/)
    return availableBooks.filter(book => {
      const titleLower = book.title.toLowerCase()
      return queryWords.every(word => titleLower.includes(word))
    })
  }, [availableBooks, searchQuery])

  // Reset highlighted index when filtered results change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [filteredBooks.length])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Show selected book title when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(displayValue)
      inputRef.current?.focus()
    }
  }, [isOpen, displayValue])

  function handleFocus() {
    setIsOpen(true)
    setSearchQuery(displayValue)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value)
    if (!isOpen) setIsOpen(true)
  }

  function handleSelect(bookId: string) {
    onChange(bookId)
    setIsOpen(false)
    setSearchQuery('')
  }

  function handleClear() {
    onChange('')
    setSearchQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        return
      }
      setHighlightedIndex(prev => 
        prev < filteredBooks.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < filteredBooks.length) {
        handleSelect(filteredBooks[highlightedIndex].id)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      setSearchQuery(displayValue)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Read mode toggle - only show when member is selected */}
      {showFilterToggle && (
        <div className="flex gap-2 mb-2 items-center">
          <button
            type="button"
            onClick={() => setReadMode('continue')}
            className={`font-lora text-xs px-3 py-1 rounded-full cursor-pointer ${
              readMode === 'continue' 
                ? 'bg-accent text-white border-none' 
                : 'bg-transparent text-accent border border-accent'
            }`}
          >
            Lanjut baca
          </button>
          <button
            type="button"
            onClick={() => setReadMode('new')}
            className={`font-lora text-xs px-3 py-1 rounded-full cursor-pointer ${
              readMode === 'new' 
                ? 'bg-accent text-white border-none' 
                : 'bg-transparent text-accent border border-accent'
            }`}
          >
            Buku baru
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        value={isOpen ? searchQuery : displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={displayValue || placeholder}
        readOnly={!isOpen}
        className={`font-crimson text-[15px] bg-transparent border-none border-b border-brown-light outline-none py-0.5 pr-6 w-full ${
          value ? 'text-brown-dark' : 'text-muted'
        }`}
      />

      {/* Clear button */}
      {value && !isOpen && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-base text-muted p-1 leading-none hover:text-accent transition-colors duration-150"
          title="Hapus pilihan"
        >
          ×
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div 
          ref={listRef} 
          className="absolute top-full left-0 right-0 z-[1000] mt-1 bg-cardBg border border-bookBorder rounded-lg shadow-card max-h-60 overflow-y-auto"
        >
          {filteredBooks.length === 0 ? (
            <div className="px-4 py-2 font-crimson text-[15px] text-muted italic">
              {emptyLabel}
            </div>
          ) : (
            filteredBooks.map((book, index) => (
              <div
                key={book.id}
                className={`px-4 py-2 cursor-pointer font-crimson text-[15px] text-brown-dark transition-colors duration-150 ${
                  index === highlightedIndex ? 'bg-accent/[0.15]' : 'bg-transparent'
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseLeave={() => setHighlightedIndex(-1)}
                onClick={() => handleSelect(book.id)}
                onMouseDown={e => e.preventDefault()}
              >
                {book.title}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
