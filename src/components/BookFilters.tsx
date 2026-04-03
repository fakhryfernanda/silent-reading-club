'use client'

import { avatarColor, initials } from '@/lib/utils'

export type BookFilterProps = {
  types?: string[]
  members?: { id: string; display_name: string }[]
  selectedType: string | null
  selectedReader: string | null
  onTypeChange: (type: string | null) => void
  onReaderChange: (readerId: string | null) => void
  onReset?: () => void
}

const BOOK_TYPES = ['Nonfiksi', 'Fiksi', 'Komik', 'Artikel', 'Jurnal', 'Kitab Suci']

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
  onTypeChange,
  onReaderChange,
  onReset,
}: BookFilterProps) {
  const hasActiveFilters = selectedType || selectedReader

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        {/* Type filter */}
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
                  {m.display_name}
                </option>
              ))}
            </select>
            {selectedReader && (
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: avatarColor(members.find(m => m.id === selectedReader)?.display_name || ''),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, color: '#fff',
              }}>
                {initials(members.find(m => m.id === selectedReader)?.display_name || '?')}
              </div>
            )}
          </div>
        )}

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
    </div>
  )
}
