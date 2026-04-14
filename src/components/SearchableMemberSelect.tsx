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

  return (
    <div ref={containerRef} className="relative w-full">
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

      {isOpen && (
        <div 
          ref={listRef} 
          className="absolute top-full left-0 right-0 z-[1000] mt-1 bg-cardBg border border-bookBorder rounded-lg shadow-card max-h-60 overflow-y-auto"
        >
          {filteredMembers.length === 0 ? (
            <div className="px-4 py-2 font-crimson text-[15px] text-muted italic">
              {emptyLabel}
            </div>
          ) : (
            filteredMembers.map((member, index) => (
              <div
                key={member.id}
                className={`px-4 py-2 cursor-pointer font-crimson text-[15px] text-brown-dark transition-colors duration-150 ${
                  index === highlightedIndex ? 'bg-accent/[0.15]' : 'bg-transparent'
                }`}
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
