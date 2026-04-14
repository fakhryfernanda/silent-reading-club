'use client'

import { useState, useEffect } from 'react'

export type BookFilterProps = {
  types?: string[]
  members?: { id: string; display_name: string; alias?: string | null }[]
  selectedType: string | null
  selectedReader: string | null
  selectedTitle: string | null
  onTypeChange: (type: string | null) => void
  onReaderChange: (readerId: string | null) => void
  onTitleChange: (title: string | null) => void
  onReset?: () => void
  isCoverMode: boolean
  onCoverModeChange: () => void
}

const BOOK_TYPES = ['Nonfiksi', 'Fiksi', 'Komik', 'Artikel', 'Jurnal', 'Kitab Suci']

const displayName = (m: { display_name: string; alias?: string | null }) =>
  m.alias || m.display_name

const chipStyle = (active: boolean): React.CSSProperties => ({
  fontFamily: 'Lora, serif',
  fontSize: 13,
  padding: '4px 14px',
  borderRadius: 999,
  border: active ? 'none' : '1px solid var(--border)',
  background: active ? 'var(--amber)' : 'var(--card-bg)',
  color: active ? '#fff' : 'var(--text-muted)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
})

const selectStyle: React.CSSProperties = {
  fontFamily: 'Crimson Pro, serif',
  fontSize: 15,
  color: 'var(--brown-dark)',
  background: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '4px 12px',
  outline: 'none',
  cursor: 'pointer',
  minWidth: 180,
}

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
    <div style={{ marginBottom: 24 }}>
      {/* Top row: Title search (left) + Reader filter (right) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        {/* Title search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Judul:
          </span>
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Cari judul buku..."
            style={{
              fontFamily: 'Crimson Pro, serif',
              fontSize: 15,
              color: 'var(--brown-dark)',
              background: 'var(--card-bg)',
              border: selectedTitle ? '1px solid var(--amber)' : '1px solid var(--border)',
              borderRadius: 8,
              padding: '4px 12px',
              outline: 'none',
              width: 200,
            }}
          />
          {selectedTitle && (
            <button
              onClick={() => setInputValue('')}
              style={{
                position: 'absolute',
                right: 8,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--text-muted)',
                padding: 2,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Reader filter */}
        {members.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Pembaca:
            </span>
            <select
              value={selectedReader || ''}
              onChange={e => onReaderChange(e.target.value || null)}
              style={selectStyle}
            >
              <option value="">Semua pembaca</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {displayName(m)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Type filter row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Tipe:
        </span>
        <button
          onClick={() => onTypeChange(null)}
          style={chipStyle(!selectedType)}
        >
          Semua
        </button>
        {types.map(type => (
          <button
            key={type}
            onClick={() => onTypeChange(selectedType === type ? null : type)}
            style={chipStyle(selectedType === type)}
          >
            {type}
          </button>
        ))}

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            onClick={() => onReset ? onReset() : (onTypeChange(null), onReaderChange(null))}
            style={{
              fontFamily: 'Lora, serif',
              fontSize: 12,
              padding: '4px 12px',
              borderRadius: 999,
              border: '1px solid var(--amber)',
              background: 'transparent',
              color: 'var(--amber)',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Cover mode toggle row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10 }}>
        <div style={{
          height: 16,
          borderLeft: '1px solid var(--border)',
          marginRight: 8,
        }} />
        <button
          onClick={onCoverModeChange}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.background = '#4a3728'
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.background = '#3d2b1f'
          }}
          style={{
            fontFamily: 'Lora, serif',
            fontSize: 12,
            padding: '4px 14px',
            borderRadius: 999,
            border: 'none',
            background: '#3d2b1f',
            color: '#fdf6ee',
            cursor: 'pointer',
            transition: 'all 0.15s',
            minWidth: 130,
            textAlign: 'center',
          }}
        >
          <span style={{ marginRight: 4, fontSize: 13 }}>⇄</span>
          {isCoverMode ? 'Lihat Info' : 'Lihat Cover'}
        </button>
      </div>
    </div>
  )
}
