'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

type MemberOption = {
  id: string
  display_name: string
}

interface SearchableMemberSelectProps {
  members: MemberOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyLabel?: string
}

export default function SearchableMemberSelect({
  members,
  value,
  onChange,
  placeholder = 'Cari pembaca...',
  emptyLabel = 'Tidak ada pembaca ditemukan',
}: SearchableMemberSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedMember = members.find(m => m.id === value)
  const displayValue = selectedMember ? selectedMember.display_name : ''

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members

    const queryWords = searchQuery.toLowerCase().trim().split(/\s+/)
    return members.filter(member => {
      const nameLower = member.display_name.toLowerCase()
      return queryWords.every(word => nameLower.includes(word))
    })
  }, [members, searchQuery])

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [filteredMembers.length])

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

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

  function handleSelect(memberId: string) {
    onChange(memberId)
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
        prev < filteredMembers.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < filteredMembers.length) {
        handleSelect(filteredMembers[highlightedIndex].id)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      setSearchQuery(displayValue)
    }
  }

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

  const getItemStyle = (isHighlighted: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    cursor: 'pointer',
    fontFamily: 'Crimson Pro, serif',
    fontSize: 15,
    color: '#2C1A0E',
    backgroundColor: isHighlighted ? 'rgba(212, 130, 74, 0.15)' : 'transparent',
    transition: 'background-color 0.15s',
  })

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

      {isOpen && (
        <div ref={listRef} style={dropdownStyle}>
          {filteredMembers.length === 0 ? (
            <div style={{ ...getItemStyle(false), color: '#7A5C3E', fontStyle: 'italic' }}>
              {emptyLabel}
            </div>
          ) : (
            filteredMembers.map((member, index) => (
              <div
                key={member.id}
                style={getItemStyle(index === highlightedIndex)}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseLeave={() => setHighlightedIndex(-1)}
                onClick={() => handleSelect(member.id)}
                onMouseDown={e => e.preventDefault()}
              >
                {member.display_name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
