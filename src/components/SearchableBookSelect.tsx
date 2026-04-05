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

  // Input style (matches project's inputStyle)
  const inputStyle: React.CSSProperties = {
    fontFamily: 'Crimson Pro, serif',
    fontSize: 15,
    color: value ? '#2C1A0E' : '#7A5C3E',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #C4956A',
    outline: 'none',
    padding: '2px 24px 2px 0',
    width: '100%',
  }

  // Dropdown container style
  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    marginTop: 4,
    backgroundColor: '#FAF6EE',
    border: '1px solid rgba(107, 63, 31, 0.15)',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(44, 26, 14, 0.1)',
    maxHeight: 240,
    overflowY: 'auto',
  }

  // List item style
  const getItemStyle = (isHighlighted: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    cursor: 'pointer',
    fontFamily: 'Crimson Pro, serif',
    fontSize: 15,
    color: '#2C1A0E',
    backgroundColor: isHighlighted ? 'rgba(212, 130, 74, 0.15)' : 'transparent',
    transition: 'background-color 0.15s',
  })

  // Clear button style
  const clearButtonStyle: React.CSSProperties = {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    color: '#7A5C3E',
    padding: 4,
    lineHeight: 1,
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Read mode toggle - only show when member is selected */}
      {showFilterToggle && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setReadMode('continue')}
            style={{
              fontFamily: 'Lora, serif',
              fontSize: 12,
              padding: '4px 12px',
              borderRadius: 999,
              cursor: 'pointer',
              background: readMode === 'continue' ? '#D4824A' : 'transparent',
              color: readMode === 'continue' ? '#fff' : '#D4824A',
              border: readMode === 'continue' ? 'none' : '1px solid #D4824A',
            }}
          >
            Lanjut baca
          </button>
          <button
            type="button"
            onClick={() => setReadMode('new')}
            style={{
              fontFamily: 'Lora, serif',
              fontSize: 12,
              padding: '4px 12px',
              borderRadius: 999,
              cursor: 'pointer',
              background: readMode === 'new' ? '#D4824A' : 'transparent',
              color: readMode === 'new' ? '#fff' : '#D4824A',
              border: readMode === 'new' ? 'none' : '1px solid #D4824A',
            }}
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
        style={inputStyle}
      />

      {/* Clear button */}
      {value && !isOpen && (
        <button
          type="button"
          onClick={handleClear}
          style={clearButtonStyle}
          onMouseEnter={e => { e.currentTarget.style.color = '#D4824A' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#7A5C3E' }}
          title="Hapus pilihan"
        >
          ×
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div ref={listRef} style={dropdownStyle}>
          {filteredBooks.length === 0 ? (
            <div style={{ ...getItemStyle(false), color: '#7A5C3E', fontStyle: 'italic' }}>
              {emptyLabel}
            </div>
          ) : (
            filteredBooks.map((book, index) => (
              <div
                key={book.id}
                style={getItemStyle(index === highlightedIndex)}
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
