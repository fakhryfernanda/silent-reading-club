'use client'

import { useState, useEffect } from 'react'

export type BookFilterProps = {
  types?: string[]
  members?: { id: string; display_name: string; alias?: string | null }[]
  selectedType: string | null
  selectedReader?: string | null
  selectedTitle: string | null
  onTypeChange: (type: string | null) => void
  onReaderChange?: (readerId: string | null) => void
  onTitleChange: (title: string | null) => void
  onReset?: () => void
  isCoverMode: boolean
  onCoverModeChange: () => void
  hideCoverToggle?: boolean
}

const BOOK_TYPES = ['Nonfiksi', 'Fiksi', 'Komik', 'Artikel', 'Jurnal', 'Kitab Suci']

export default function BookFilters({
  types = BOOK_TYPES,
  members = [],
  selectedType,
  selectedReader,
  selectedTitle,
  onTypeChange,
  onReaderChange,
  onTitleChange,
  onReset,
  isCoverMode,
  onCoverModeChange,
  hideCoverToggle = false,
}: BookFilterProps) {
  const [inputValue, setInputValue] = useState(selectedTitle || '')

  // Debounce input value before calling onTitleChange
  useEffect(() => {
    const timer = setTimeout(() => {
      onTitleChange(inputValue.trim() || null)
    }, 300)
    return () => clearTimeout(timer)
  }, [inputValue, onTitleChange])

  // Sync input value when selectedTitle changes externally (e.g. reset)
  useEffect(() => {
    setInputValue(selectedTitle || '')
  }, [selectedTitle])

  const hasActiveFilters = selectedType || selectedReader || selectedTitle

  return (
    <div className="mb-6">
      {/* Top row: Title search (left) + Reader filter (right) */}
      <div className="flex flex-wrap gap-3 items-center mb-3">
        {/* Title search */}
        <div className="flex items-center gap-2 relative">
          <span className="font-lora text-xs text-muted tracking-widest uppercase">
            Judul:
          </span>
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Cari judul buku..."
            className={`font-crimson text-[15px] text-brown-dark bg-cardBg rounded-lg px-3 py-0.5 outline-none w-[200px] ${
              selectedTitle ? 'border border-accent' : 'border border-bookBorder'
            }`}
          />
          {selectedTitle && (
            <button
              onClick={() => setInputValue('')}
              className="absolute right-2 bg-transparent border-none cursor-pointer text-sm text-muted p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Reader filter */}
        {onReaderChange && members.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-lora text-xs text-muted tracking-widest uppercase">
              Pembaca:
            </span>
            <select
              value={selectedReader || ''}
              onChange={e => onReaderChange(e.target.value || null)}
              className="font-crimson text-[15px] text-brown-dark bg-cardBg border border-bookBorder rounded-lg px-3 py-1 outline-none cursor-pointer min-w-[180px]"
            >
              <option value="">Semua pembaca</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Type filter row */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="font-lora text-xs text-muted tracking-widest uppercase">
          Tipe:
        </span>
        <button
          onClick={() => onTypeChange(null)}
          className={`font-lora text-[13px] px-[14px] py-0.5 rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer ${
            !selectedType
              ? 'bg-accent text-white border-none'
              : 'bg-cardBg border border-bookBorder text-muted'
          }`}
        >
          Semua
        </button>
        {types.map(type => (
          <button
            key={type}
            onClick={() => onTypeChange(selectedType === type ? null : type)}
            className={`font-lora text-[13px] px-[14px] py-0.5 rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer ${
              selectedType === type
                ? 'bg-accent text-white border-none'
                : 'bg-cardBg border border-bookBorder text-muted'
            }`}
          >
            {type}
          </button>
        ))}

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            onClick={() => onReset ? onReset() : onTypeChange(null)}
            className="font-lora text-xs px-3 py-0.5 rounded-full border border-accent bg-transparent text-accent cursor-pointer ml-auto"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Cover mode toggle row */}
      {!hideCoverToggle && (
        <div className="flex justify-end items-center mt-2.5">
          <div className="h-4 border-l border-bookBorder mr-2" />
          <button
            onClick={onCoverModeChange}
            className="font-lora text-xs px-[14px] py-1 rounded-full border-none bg-brown-dark text-[#fdf6ee] cursor-pointer transition-all duration-150 min-w-[130px] text-center hover:bg-[#4a3728]"
          >
            <span className="mr-1 text-[13px]">⇄</span>
            {isCoverMode ? 'Lihat Info' : 'Lihat Cover'}
          </button>
        </div>
      )}
    </div>
  )
}
