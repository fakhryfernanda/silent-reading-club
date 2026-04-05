'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { timeAgo, avatarColor, initials } from '@/lib/utils'
import BookFilters from '@/components/BookFilters'
import type { Attachment } from '@/lib/types'

type AdminMember = {
  id: string
  wa_phone: string
  display_name: string
  created_at: string
  note_count: number
}

type AdminBook = {
  id: string
  title: string
  author: string | null
  type: string | null
  cover_url: string | null
  created_at: string
  note_count: number
  readers?: { id: string; display_name: string }[]
}

type AdminNote = {
  id: string
  member_id: string
  book_id: string
  content: string
  raw_message: string | null
  sort_order: number
  created_at: string
  member_name: string
  book_title: string
  attachments?: Attachment[]
}

const BOOK_TYPES = ['Nonfiksi', 'Fiksi', 'Komik', 'Artikel', 'Jurnal', 'Kitab Suci']

type AdminData = {
  members: AdminMember[]
  books: AdminBook[]
  notes: AdminNote[]
}

type Tab = 'members' | 'books' | 'notes'
type EditTarget = { type: Tab; id: string } | null
type DeleteTarget = { type: Tab; id: string; label: string } | null
type AddForm = 'member' | 'book' | 'note' | null

const inputStyle: React.CSSProperties = {
  fontFamily: 'Crimson Pro, serif',
  fontSize: 15,
  color: 'var(--brown-dark)',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid var(--brown-light)',
  outline: 'none',
  padding: '2px 0',
  width: '100%',
}

const btnBase: React.CSSProperties = {
  fontFamily: 'Lora, serif',
  fontSize: 13,
  borderRadius: 999,
  border: 'none',
  cursor: 'pointer',
  padding: '4px 12px',
  transition: 'all 0.15s',
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [tab, setTab] = useState<Tab>('books')
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [addForm, setAddForm] = useState<AddForm>(null)
  const [addValues, setAddValues] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notePreview, setNotePreview] = useState(false)
  const [uploadingNoteId, setUploadingNoteId] = useState<string | null>(null)
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null)
  const addFilesRef = useRef<FileList | null>(null)
  const addCoverRef = useRef<File | null>(null)
  const editCoverRef = useRef<File | null>(null)

  // Filter states
  const [bookTypeFilter, setBookTypeFilter] = useState<string | null>(null)
  const [bookReaderFilter, setBookReaderFilter] = useState<string | null>(null)
  const [bookTitleFilter, setBookTitleFilter] = useState<string | null>(null)
  const [noteMemberFilter, setNoteMemberFilter] = useState<string | null>(null)
  const [noteBookFilter, setNoteBookFilter] = useState<string | null>(null)
  const [noteBookTitleFilter, setNoteBookTitleFilter] = useState<string | null>(null)
  
  const keyRef = useRef<string>('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    keyRef.current = params.get('key') ?? ''
    fetchData()
  }, [])

  useEffect(() => {
    if (!errorMessage) return
    const t = setTimeout(() => setErrorMessage(null), 4000)
    return () => clearTimeout(t)
  }, [errorMessage])

  // Refetch when filters change
  useEffect(() => {
    if (!loading && data) {
      fetchData()
    }
  }, [bookTypeFilter, bookReaderFilter, bookTitleFilter, noteMemberFilter, noteBookFilter, noteBookTitleFilter])

  async function fetchData() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ key: keyRef.current })
      if (bookTypeFilter) params.set('bookType', bookTypeFilter)
      if (bookReaderFilter) params.set('bookReaderId', bookReaderFilter)
      if (bookTitleFilter) params.set('bookTitle', bookTitleFilter)
      if (noteMemberFilter) params.set('noteMemberId', noteMemberFilter)
      if (noteBookFilter) params.set('noteBookId', noteBookFilter)
      if (noteBookTitleFilter) params.set('noteBookTitle', noteBookTitleFilter)
      
      const res = await fetch(`/api/admin/data?${params.toString()}`)
      if (res.status === 401) {
        setUnauthorized(true)
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      setErrorMessage('Gagal memuat data.')
    } finally {
      setLoading(false)
    }
  }

  function apiUrl(path: string) {
    return `${path}?key=${keyRef.current}`
  }

  function showError(msg: string) {
    setErrorMessage(msg)
  }

  // ── EDIT ──────────────────────────────────────────────
  function startEdit(type: Tab, id: string, values: Record<string, string>) {
    setEditTarget({ type, id })
    setEditValues(values)
    setDeleteTarget(null)
    setAddForm(null)
  }

  function cancelEdit() {
    setEditTarget(null)
    setEditValues({})
    setNotePreview(false)
  }

  async function saveEdit() {
    if (!editTarget || !data) return
    setSaving(true)
    try {
      let body: Record<string, string | null> = {}
      let url = ''
      if (editTarget.type === 'members') {
        body = { display_name: editValues.display_name, wa_phone: editValues.wa_phone }
        url = `/api/admin/members/${editTarget.id}`
      } else if (editTarget.type === 'books') {
        url = `/api/admin/books/${editTarget.id}`
        const form = new FormData()
        form.append('title', editValues.title ?? '')
        form.append('author', editValues.author ?? '')
        form.append('type', editValues.type ?? '')
        if (editCoverRef.current) form.append('file', editCoverRef.current)

        const res = await fetch(apiUrl(url), { method: 'PATCH', body: form })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          showError(j.error ?? 'Gagal menyimpan.')
          return
        }
        const updated = await res.json()
        setData({ ...data, books: data.books.map(b => b.id === editTarget.id ? { ...b, ...updated } : b) })
        cancelEdit()
        editCoverRef.current = null
        return
      } else {
        body = { content: editValues.content, sort_order: editValues.sort_order || null }
        url = `/api/admin/notes/${editTarget.id}`
      }

      const res = await fetch(apiUrl(url), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json()
        showError(j.error ?? 'Gagal menyimpan.')
        return
      }
      const updated = await res.json()

      if (editTarget.type === 'members') {
        setData({ ...data, members: data.members.map(m => m.id === editTarget.id ? { ...m, ...updated } : m) })
        setData(d => d ? {
          ...d,
          notes: d.notes.map(n => n.member_id === editTarget.id ? { ...n, member_name: updated.display_name } : n)
        } : d)
      } else {
        // notes
        setData({ ...data, notes: data.notes.map(n => n.id === editTarget.id ? { ...n, ...updated } : n) })
      }
      cancelEdit()
      setNotePreview(false)
    } finally {
      setSaving(false)
    }
  }

  // ── DELETE ────────────────────────────────────────────
  function startDelete(type: Tab, id: string, label: string) {
    setDeleteTarget({ type, id, label })
    setEditTarget(null)
    setAddForm(null)
  }

  function cancelDelete() {
    setDeleteTarget(null)
  }

  async function confirmDelete() {
    if (!deleteTarget || !data) return
    setSaving(true)
    try {
      let url = ''
      if (deleteTarget.type === 'members') url = `/api/admin/members/${deleteTarget.id}`
      else if (deleteTarget.type === 'books') url = `/api/admin/books/${deleteTarget.id}`
      else url = `/api/admin/notes/${deleteTarget.id}`

      const res = await fetch(apiUrl(url), { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json()
        showError(j.error ?? 'Gagal menghapus.')
        return
      }

      if (deleteTarget.type === 'members') {
        const deletedId = deleteTarget.id
        setData(d => d ? {
          ...d,
          members: d.members.filter(m => m.id !== deletedId),
          notes: d.notes.filter(n => n.member_id !== deletedId),
        } : d)
      } else if (deleteTarget.type === 'books') {
        const deletedId = deleteTarget.id
        setData(d => d ? {
          ...d,
          books: d.books.filter(b => b.id !== deletedId),
          notes: d.notes.filter(n => n.book_id !== deletedId),
        } : d)
      } else {
        const deletedId = deleteTarget.id
        setData(d => d ? { ...d, notes: d.notes.filter(n => n.id !== deletedId) } : d)
      }
      setDeleteTarget(null)
    } finally {
      setSaving(false)
    }
  }

  // ── ADD ───────────────────────────────────────────────
  function openAddForm(type: AddForm) {
    setAddForm(type)
    setAddValues({})
    setEditTarget(null)
    setDeleteTarget(null)
  }

  function cancelAdd() {
    setAddForm(null)
    setAddValues({})
    addFilesRef.current = null
    addCoverRef.current = null
  }

  async function submitAdd() {
    if (!data) return
    setSaving(true)
    try {
      let url = ''
      let body: Record<string, string | null> = {}

      if (addForm === 'member') {
        url = '/api/admin/members'
        body = { wa_phone: addValues.wa_phone?.trim(), display_name: addValues.display_name?.trim() }
      } else if (addForm === 'book') {
        url = '/api/admin/books'
        const form = new FormData()
        form.append('title', addValues.title?.trim() ?? '')
        if (addValues.author?.trim()) form.append('author', addValues.author.trim())
        if (addValues.type?.trim()) form.append('type', addValues.type.trim())
        if (addCoverRef.current) form.append('file', addCoverRef.current)

        const res = await fetch(apiUrl(url), { method: 'POST', body: form })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          showError(j.error ?? 'Gagal menambah data.')
          return
        }
        const created = await res.json()
        setData(d => d ? { ...d, books: [{ ...created, note_count: 0 }, ...d.books] } : d)
        cancelAdd()
        return
      } else {
        url = '/api/admin/notes'
        body = {
          member_id: addValues.member_id,
          book_id: addValues.book_id,
          content: addValues.content?.trim(),
          raw_message: null,
        }
      }

      const res = await fetch(apiUrl(url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json()
        showError(j.error ?? 'Gagal menambah data.')
        return
      }
      const created = await res.json()

      if (addForm === 'member') {
        setData(d => d ? { ...d, members: [{ ...created, note_count: 0 }, ...d.members] } : d)
      } else {
        const member = data.members.find(m => m.id === addValues.member_id)
        const book = data.books.find(b => b.id === addValues.book_id)

        // Upload attachments if any files were selected
        let attachments: Attachment[] = []
        const files = addFilesRef.current
        if (files && files.length > 0) {
          const form = new FormData()
          form.append('note_id', created.id)
          for (const file of Array.from(files)) form.append('file', file)
          const attRes = await fetch(apiUrl('/api/admin/attachments'), { method: 'POST', body: form })
          if (attRes.ok) {
            attachments = await attRes.json()
          }
        }

        const newNote: AdminNote = {
          ...created,
          member_name: member?.display_name ?? '',
          book_title: book?.title ?? '',
          attachments,
        }
        setData(d => d ? {
          ...d,
          notes: [newNote, ...d.notes],
          members: d.members.map(m => m.id === addValues.member_id ? { ...m, note_count: m.note_count + 1 } : m),
          books: d.books.map(b => b.id === addValues.book_id ? { ...b, note_count: b.note_count + 1 } : b),
        } : d)
      }
      cancelAdd()
    } finally {
      setSaving(false)
    }
  }

  // ── ATTACHMENTS ───────────────────────────────────────
  async function uploadAttachments(noteId: string, files: FileList) {
    setUploadingNoteId(noteId)
    try {
      const form = new FormData()
      form.append('note_id', noteId)
      for (const file of Array.from(files)) {
        form.append('file', file)
      }
      const res = await fetch(apiUrl('/api/admin/attachments'), { method: 'POST', body: form })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        showError(j.error ?? 'Gagal mengunggah foto.')
        return
      }
      const newAttachments: Attachment[] = await res.json()
      setData(d => d ? {
        ...d,
        notes: d.notes.map(n => n.id === noteId
          ? { ...n, attachments: [...(n.attachments ?? []), ...newAttachments] }
          : n
        )
      } : d)
    } finally {
      setUploadingNoteId(null)
    }
  }

  async function deleteAttachment(noteId: string, attachmentId: string) {
    setDeletingAttachmentId(attachmentId)
    try {
      const res = await fetch(apiUrl(`/api/admin/attachments/${attachmentId}`), { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json()
        showError(j.error ?? 'Gagal menghapus foto.')
        return
      }
      setData(d => d ? {
        ...d,
        notes: d.notes.map(n => n.id === noteId
          ? { ...n, attachments: (n.attachments ?? []).filter(a => a.id !== attachmentId) }
          : n
        )
      } : d)
    } finally {
      setDeletingAttachmentId(null)
    }
  }

  // ── RENDER ────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ fontFamily: 'Crimson Pro, serif', fontSize: 18, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Memuat data admin...
        </p>
      </div>
    )
  }

  if (unauthorized) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 20, color: 'var(--brown-dark)' }}>Akses Ditolak</p>
        <p style={{ fontFamily: 'Crimson Pro, serif', fontSize: 16, color: 'var(--text-muted)' }}>
          Pastikan URL mengandung <code>?key=...</code> yang benar.
        </p>
      </div>
    )
  }

  if (!data) return null

  const addLabel = tab === 'members' ? 'Anggota' : tab === 'books' ? 'Buku' : 'Catatan'
  const addFormType: AddForm = tab === 'members' ? 'member' : tab === 'books' ? 'book' : 'note'

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 28px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: 26, color: 'var(--brown-dark)', margin: 0 }}>
          Admin — Silent Reading Club
        </h1>
        <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
          {[
            { label: 'Buku', count: data.books.length },
            { label: 'Pembaca', count: data.members.length },
            { label: 'Catatan', count: data.notes.length },
          ].map(s => (
            <span key={s.label} style={{ fontFamily: 'Crimson Pro, serif', fontSize: 15, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--amber)' }}>{s.count}</strong> {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div style={{
          background: 'rgba(212,130,74,0.12)',
          border: '1px solid var(--amber)',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 20,
          fontFamily: 'Crimson Pro, serif',
          fontSize: 15,
          color: 'var(--brown-dark)',
        }}>
          {errorMessage}
        </div>
      )}

      {/* Tab bar + Add button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['books', 'members', 'notes'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => {
                setTab(t)
                cancelEdit()
                cancelDelete()
                cancelAdd()
                // Reset filters when switching tabs
                if (t === 'books') {
                  setNoteMemberFilter(null)
                  setNoteBookFilter(null)
                  setNoteBookTitleFilter(null)
                } else if (t === 'notes') {
                  setBookTypeFilter(null)
                  setBookReaderFilter(null)
                  setBookTitleFilter(null)
                } else {
                  setBookTypeFilter(null)
                  setBookReaderFilter(null)
                  setBookTitleFilter(null)
                  setNoteMemberFilter(null)
                  setNoteBookFilter(null)
                  setNoteBookTitleFilter(null)
                }
              }}
              style={{
                ...btnBase,
                padding: '6px 18px',
                fontSize: 14,
                background: tab === t ? 'var(--amber)' : 'var(--card-bg)',
                color: tab === t ? '#fff' : 'var(--text-muted)',
                border: tab === t ? 'none' : '1px solid var(--border)',
              }}
            >
              {t === 'members' ? 'Anggota' : t === 'books' ? 'Buku' : 'Catatan'}
            </button>
          ))}
        </div>
        <button
          onClick={() => addForm === addFormType ? cancelAdd() : openAddForm(addFormType)}
          style={{
            ...btnBase,
            padding: '6px 16px',
            fontSize: 14,
            background: addForm === addFormType ? 'var(--card-bg)' : 'var(--brown-dark)',
            color: addForm === addFormType ? 'var(--text-muted)' : '#fff',
            border: addForm === addFormType ? '1px solid var(--border)' : 'none',
          }}
        >
          {addForm === addFormType ? 'Batal Tambah' : `+ Tambah ${addLabel}`}
        </button>
      </div>

      {/* Add Form */}
      {addForm && (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '20px 24px',
          marginBottom: 20,
          borderLeft: '4px solid var(--amber)',
        }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--brown-mid)', margin: '0 0 16px' }}>
            Tambah {addLabel} Baru
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {addForm === 'member' && (
              <>
                <FormField label="Nomor WA" value={addValues.wa_phone ?? ''} onChange={v => setAddValues(p => ({ ...p, wa_phone: v }))} placeholder="+628111..." />
                <FormField label="Nama Tampil" value={addValues.display_name ?? ''} onChange={v => setAddValues(p => ({ ...p, display_name: v }))} placeholder="Nama anggota" />
              </>
            )}
            {addForm === 'book' && (
              <>
                <FormField label="Judul" value={addValues.title ?? ''} onChange={v => setAddValues(p => ({ ...p, title: v }))} placeholder="Judul buku / artikel / komik..." />
                <FormField label="Penulis (opsional)" value={addValues.author ?? ''} onChange={v => setAddValues(p => ({ ...p, author: v }))} placeholder="Nama penulis" />
                <div>
                  <label style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tipe (opsional)</label>
                  <select
                    value={addValues.type ?? ''}
                    onChange={e => setAddValues(p => ({ ...p, type: e.target.value }))}
                    style={{ ...inputStyle, width: 'auto', minWidth: 160 }}
                  >
                    <option value="">— pilih tipe —</option>
                    {BOOK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Cover (opsional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      addCoverRef.current = e.target.files?.[0] ?? null
                      setAddValues(p => ({ ...p, _coverName: e.target.files?.[0]?.name ?? '' }))
                    }}
                    style={{ fontFamily: 'Crimson Pro, serif', fontSize: 14, color: 'var(--brown-dark)' }}
                  />
                </div>
              </>
            )}
            {addForm === 'note' && (
              <>
                <div>
                  <label style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Anggota</label>
                  <select
                    value={addValues.member_id ?? ''}
                    onChange={e => setAddValues(p => ({ ...p, member_id: e.target.value }))}
                    style={{ ...inputStyle, width: 'auto', minWidth: 200 }}
                  >
                    <option value="">Pilih anggota...</option>
                    {data.members.map(m => (
                      <option key={m.id} value={m.id}>{m.display_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Buku</label>
                  <select
                    value={addValues.book_id ?? ''}
                    onChange={e => setAddValues(p => ({ ...p, book_id: e.target.value }))}
                    style={{ ...inputStyle, width: 'auto', minWidth: 200 }}
                  >
                    <option value="">Pilih buku...</option>
                    {data.books.map(b => (
                      <option key={b.id} value={b.id}>{b.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Catatan</label>
                  <textarea
                    value={addValues.content ?? ''}
                    onChange={e => setAddValues(p => ({ ...p, content: e.target.value }))}
                    placeholder="Tulis catatan..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Crimson Pro, serif', fontSize: 15 }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Foto (opsional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => {
                      addFilesRef.current = e.target.files
                      setAddValues(p => ({ ...p, _fileCount: String(e.target.files?.length ?? 0) }))
                    }}
                    style={{ fontFamily: 'Crimson Pro, serif', fontSize: 14, color: 'var(--brown-dark)' }}
                  />
                  {addValues._fileCount && Number(addValues._fileCount) > 0 && (
                    <span style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
                      {addValues._fileCount} foto dipilih
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={submitAdd} disabled={saving} style={{ ...btnBase, background: 'var(--amber)', color: '#fff', opacity: saving ? 0.6 : 1 }}>
              Simpan
            </button>
            <button onClick={cancelAdd} style={{ ...btnBase, background: 'var(--card-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {tab === 'members' && (
        <MembersList
          members={data.members}
          editTarget={editTarget}
          editValues={editValues}
          deleteTarget={deleteTarget}
          saving={saving}
          onEdit={(id, vals) => startEdit('members', id, vals)}
          onEditChange={setEditValues}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelEdit}
          onDelete={(id, label) => startDelete('members', id, label)}
          onConfirmDelete={confirmDelete}
          onCancelDelete={cancelDelete}
        />
      )}
      {tab === 'books' && (
        <>
          <BookFilters
            members={data.members}
            selectedType={bookTypeFilter}
            selectedReader={bookReaderFilter}
            selectedTitle={bookTitleFilter}
            onTypeChange={setBookTypeFilter}
            onReaderChange={setBookReaderFilter}
            onTitleChange={setBookTitleFilter}
          />
          <BooksList
            books={data.books}
            editTarget={editTarget}
            editValues={editValues}
            deleteTarget={deleteTarget}
            saving={saving}
            hasActiveFilters={!!bookTypeFilter || !!bookReaderFilter || !!bookTitleFilter}
            editCoverRef={editCoverRef}
            onEdit={(id, vals) => { startEdit('books', id, vals); editCoverRef.current = null }}
            onEditChange={setEditValues}
            onSaveEdit={saveEdit}
            onCancelEdit={() => { cancelEdit(); editCoverRef.current = null }}
            onDelete={(id, label) => startDelete('books', id, label)}
            onConfirmDelete={confirmDelete}
            onCancelDelete={cancelDelete}
          />
        </>
      )}
      {tab === 'notes' && (
        <>
          <NotesFilter
            members={data.members}
            books={data.books}
            selectedMember={noteMemberFilter}
            selectedBook={noteBookFilter}
            selectedBookTitle={noteBookTitleFilter}
            onMemberChange={setNoteMemberFilter}
            onBookChange={setNoteBookFilter}
            onBookTitleChange={setNoteBookTitleFilter}
          />
          <NotesList
            notes={data.notes}
            editTarget={editTarget}
            editValues={editValues}
            deleteTarget={deleteTarget}
            saving={saving}
            notePreview={notePreview}
            hasActiveFilters={!!noteMemberFilter || !!noteBookFilter || !!noteBookTitleFilter}
            uploadingNoteId={uploadingNoteId}
            deletingAttachmentId={deletingAttachmentId}
            onTogglePreview={() => setNotePreview(p => !p)}
            onEdit={(id, vals) => { startEdit('notes', id, vals); setNotePreview(false) }}
            onEditChange={setEditValues}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
            onDelete={(id, label) => startDelete('notes', id, label)}
            onConfirmDelete={confirmDelete}
            onCancelDelete={cancelDelete}
            onUploadAttachments={uploadAttachments}
            onDeleteAttachment={deleteAttachment}
          />
        </>
      )}
    </div>
  )
}

// ── FORM FIELD ──────────────────────────────────────────
function FormField({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  )
}

// ── ACTION BUTTONS ──────────────────────────────────────
function ActionButtons({ isEditing, isDeleting, deleteLabel, saving, onEdit, onDelete, onSaveEdit, onCancelEdit, onConfirmDelete, onCancelDelete }: {
  isEditing: boolean
  isDeleting: boolean
  deleteLabel: string
  saving: boolean
  onEdit: () => void
  onDelete: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}) {
  if (isEditing) {
    return (
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={onSaveEdit} disabled={saving} style={{ ...btnBase, background: 'var(--amber)', color: '#fff', opacity: saving ? 0.6 : 1 }}>Simpan</button>
        <button onClick={onCancelEdit} style={{ ...btnBase, background: 'var(--card-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Batal</button>
      </div>
    )
  }
  if (isDeleting) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'var(--brown-mid)' }}>Hapus {deleteLabel}?</span>
        <button onClick={onConfirmDelete} disabled={saving} style={{ ...btnBase, background: 'var(--amber)', color: '#fff', opacity: saving ? 0.6 : 1 }}>Ya, Hapus</button>
        <button onClick={onCancelDelete} style={{ ...btnBase, background: 'var(--card-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Batal</button>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
      <button onClick={onEdit} style={{ ...btnBase, background: 'var(--card-bg)', color: 'var(--brown-mid)', border: '1px solid var(--border)' }}>Edit</button>
      <button onClick={onDelete} style={{ ...btnBase, background: 'var(--card-bg)', color: 'var(--brown-mid)', border: '1px solid var(--border)' }}>Hapus</button>
    </div>
  )
}

// ── MEMBERS LIST ────────────────────────────────────────
function MembersList({ members, editTarget, editValues, deleteTarget, saving, onEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete, onConfirmDelete, onCancelDelete }: {
  members: AdminMember[]
  editTarget: EditTarget
  editValues: Record<string, string>
  deleteTarget: DeleteTarget
  saving: boolean
  onEdit: (id: string, vals: Record<string, string>) => void
  onEditChange: (vals: Record<string, string>) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: (id: string, label: string) => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}) {
  if (members.length === 0) {
    return <EmptyState text="Belum ada anggota." />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {members.map(m => {
        const isEditing = editTarget?.type === 'members' && editTarget.id === m.id
        const isDeleting = deleteTarget?.type === 'members' && deleteTarget.id === m.id
        return (
          <div key={m.id} style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 20px',
            borderLeft: '4px solid var(--amber)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: avatarColor(m.display_name),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Lora, serif', fontSize: 15, color: '#fff', fontWeight: 600,
            }}>
              {initials(m.display_name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={editValues.display_name ?? ''}
                    onChange={e => onEditChange({ ...editValues, display_name: e.target.value })}
                    style={{ ...inputStyle, fontSize: 16, fontWeight: 600, marginBottom: 6 }}
                    autoFocus
                    placeholder="Nama tampil"
                  />
                  <input
                    type="text"
                    value={editValues.wa_phone ?? ''}
                    onChange={e => onEditChange({ ...editValues, wa_phone: e.target.value })}
                    style={{ ...inputStyle, fontSize: 14, marginBottom: 4 }}
                    placeholder="Nomor WA, cth: +628111..."
                  />
                </>
              ) : (
                <p style={{ margin: '0 0 2px', fontFamily: 'Lora, serif', fontSize: 16, color: 'var(--brown-dark)', fontWeight: 600 }}>
                  {m.display_name}
                </p>
              )}
              {!isEditing && (
                <p style={{ margin: '0 0 2px', fontFamily: 'Crimson Pro, serif', fontSize: 14, color: 'var(--text-muted)' }}>
                  {m.wa_phone}
                </p>
              )}
              <p style={{ margin: 0, fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'var(--text-muted)' }}>
                {m.note_count} catatan · bergabung {timeAgo(m.created_at)}
              </p>
            </div>
            <ActionButtons
              isEditing={isEditing}
              isDeleting={isDeleting}
              deleteLabel={`"${m.display_name}" + ${m.note_count} catatan`}
              saving={saving}
              onEdit={() => onEdit(m.id, { display_name: m.display_name, wa_phone: m.wa_phone })}
              onDelete={() => onDelete(m.id, `"${m.display_name}"`)}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onConfirmDelete={onConfirmDelete}
              onCancelDelete={onCancelDelete}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── BOOKS LIST ──────────────────────────────────────────
function BooksList({ books, editTarget, editValues, deleteTarget, saving, onEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete, onConfirmDelete, onCancelDelete, hasActiveFilters, editCoverRef }: {
  books: AdminBook[]
  editTarget: EditTarget
  editValues: Record<string, string>
  deleteTarget: DeleteTarget
  saving: boolean
  onEdit: (id: string, vals: Record<string, string>) => void
  onEditChange: (vals: Record<string, string>) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: (id: string, label: string) => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  hasActiveFilters?: boolean
  editCoverRef: React.MutableRefObject<File | null>
}) {
  if (books.length === 0) {
    return <EmptyState text={hasActiveFilters ? "Tidak ada buku yang sesuai dengan filter." : "Belum ada buku."} />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {books.map(b => {
        const isEditing = editTarget?.type === 'books' && editTarget.id === b.id
        const isDeleting = deleteTarget?.type === 'books' && deleteTarget.id === b.id
        return (
          <div key={b.id} style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 20px',
            borderLeft: '4px solid var(--brown-light)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}>
            <div style={{ width: 38, flexShrink: 0 }}>
              {b.cover_url ? (
                <img
                  src={b.cover_url}
                  alt={b.title}
                  style={{ width: 38, height: 'auto', borderRadius: 4, display: 'block', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: 38, height: 38, borderRadius: 6,
                  background: 'var(--brown-mid)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Lora, serif', fontSize: 16, color: '#fff',
                }}>
                  📖
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={editValues.title ?? ''}
                    onChange={e => onEditChange({ ...editValues, title: e.target.value })}
                    style={{ ...inputStyle, fontSize: 16, fontWeight: 600, marginBottom: 6 }}
                    autoFocus
                    placeholder="Judul"
                  />
                  <input
                    type="text"
                    value={editValues.author ?? ''}
                    onChange={e => onEditChange({ ...editValues, author: e.target.value })}
                    style={{ ...inputStyle, fontSize: 14, marginBottom: 6 }}
                    placeholder="Penulis (opsional)"
                  />
                  <select
                    value={editValues.type ?? ''}
                    onChange={e => onEditChange({ ...editValues, type: e.target.value })}
                    style={{ ...inputStyle, width: 'auto', minWidth: 140, fontSize: 13 }}
                  >
                    <option value="">— tipe —</option>
                    {BOOK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div style={{ marginTop: 6 }}>
                    <label style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>
                      {b.cover_url ? 'Ganti cover' : 'Upload cover'} (opsional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => { editCoverRef.current = e.target.files?.[0] ?? null }}
                      style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'var(--brown-dark)' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <p style={{ margin: 0, fontFamily: 'Lora, serif', fontSize: 16, color: 'var(--brown-dark)', fontWeight: 600 }}>
                      {b.title}
                    </p>
                    {b.type && (
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--amber)', border: '1px solid var(--amber)', borderRadius: 999, padding: '1px 8px' }}>
                        {b.type}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0 0 2px', fontFamily: 'Crimson Pro, serif', fontSize: 14, color: 'var(--text-muted)', fontStyle: b.author ? 'normal' : 'italic' }}>
                    {b.author ?? 'Penulis tidak diketahui'}
                  </p>
                </>
              )}
              <p style={{ margin: 0, fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'var(--text-muted)' }}>
                {b.note_count} catatan · ditambahkan {timeAgo(b.created_at)}
              </p>
            </div>
            <ActionButtons
              isEditing={isEditing}
              isDeleting={isDeleting}
              deleteLabel={`"${b.title}" + ${b.note_count} catatan`}
              saving={saving}
              onEdit={() => onEdit(b.id, { title: b.title, author: b.author ?? '', type: b.type ?? '', cover_url: b.cover_url ?? '' })}
              onDelete={() => onDelete(b.id, `"${b.title}"`)}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onConfirmDelete={onConfirmDelete}
              onCancelDelete={onCancelDelete}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── NOTES LIST ──────────────────────────────────────────
function NotesList({ notes, editTarget, editValues, deleteTarget, saving, notePreview, onTogglePreview, onEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete, onConfirmDelete, onCancelDelete, hasActiveFilters, uploadingNoteId, deletingAttachmentId, onUploadAttachments, onDeleteAttachment }: {
  notes: AdminNote[]
  editTarget: EditTarget
  editValues: Record<string, string>
  deleteTarget: DeleteTarget
  saving: boolean
  notePreview: boolean
  onTogglePreview: () => void
  onEdit: (id: string, vals: Record<string, string>) => void
  onEditChange: (vals: Record<string, string>) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: (id: string, label: string) => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  hasActiveFilters?: boolean
  uploadingNoteId: string | null
  deletingAttachmentId: string | null
  onUploadAttachments: (noteId: string, files: FileList) => void
  onDeleteAttachment: (noteId: string, attachmentId: string) => void
}) {
  const [confirmDeleteAttachmentId, setConfirmDeleteAttachmentId] = useState<string | null>(null)

  if (notes.length === 0) {
    return <EmptyState text={hasActiveFilters ? "Tidak ada catatan yang sesuai dengan filter." : "Belum ada catatan."} />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {notes.map(n => {
        const isEditing = editTarget?.type === 'notes' && editTarget.id === n.id
        const isDeleting = deleteTarget?.type === 'notes' && deleteTarget.id === n.id
        return (
          <div key={n.id} style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 20px',
            borderLeft: '4px solid var(--brown-light)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: avatarColor(n.member_name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Lora, serif', fontSize: 12, color: '#fff', fontWeight: 600,
                }}>
                  {initials(n.member_name)}
                </div>
                <span style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--brown-dark)' }}>
                  {n.member_name}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>→</span>
                <span style={{ fontFamily: 'Crimson Pro, serif', fontSize: 14, color: 'var(--brown-mid)', fontStyle: 'italic' }}>
                  {n.book_title}
                </span>
                <span style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'var(--text-muted)' }}>
                  · {timeAgo(n.created_at)}
                </span>
                {!isEditing && (
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--brown-light)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 7px', marginLeft: 4 }}>
                    #{n.sort_order}
                  </span>
                )}
              </div>
              <ActionButtons
                isEditing={isEditing}
                isDeleting={isDeleting}
                deleteLabel="catatan ini"
                saving={saving}
                onEdit={() => onEdit(n.id, { content: n.content, sort_order: String(n.sort_order) })}
                onDelete={() => onDelete(n.id, 'catatan ini')}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onConfirmDelete={onConfirmDelete}
                onCancelDelete={onCancelDelete}
              />
            </div>
            {isEditing ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => { if (notePreview) onTogglePreview() }}
                      style={{ ...btnBase, fontSize: 12, padding: '3px 10px', background: !notePreview ? 'var(--brown-dark)' : 'var(--card-bg)', color: !notePreview ? '#fff' : 'var(--text-muted)', border: notePreview ? '1px solid var(--border)' : 'none' }}
                    >Edit</button>
                    <button
                      onClick={() => { if (!notePreview) onTogglePreview() }}
                      style={{ ...btnBase, fontSize: 12, padding: '3px 10px', background: notePreview ? 'var(--brown-dark)' : 'var(--card-bg)', color: notePreview ? '#fff' : 'var(--text-muted)', border: !notePreview ? '1px solid var(--border)' : 'none' }}
                    >Preview</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Urutan #</label>
                    <input
                      type="number"
                      min={1}
                      value={editValues.sort_order ?? ''}
                      onChange={e => onEditChange({ ...editValues, sort_order: e.target.value })}
                      style={{ ...inputStyle, width: 52, textAlign: 'center' }}
                    />
                  </div>
                </div>
                {notePreview ? (
                  <div className="note-content" style={{ minHeight: 80, padding: '8px 0' }}>
                    <ReactMarkdown>{editValues.content ?? ''}</ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    value={editValues.content ?? ''}
                    onChange={e => onEditChange({ ...editValues, content: e.target.value })}
                    rows={5}
                    style={{ ...inputStyle, resize: 'vertical', width: '100%', fontFamily: 'Crimson Pro, serif', fontSize: 15 }}
                    autoFocus
                  />
                )}
              </>
            ) : (
              <p style={{
                margin: 0,
                fontFamily: 'Crimson Pro, serif',
                fontSize: 15,
                color: 'var(--brown-dark)',
                lineHeight: 1.6,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {n.content}
              </p>
            )}

            {/* Attachments section */}
            <div style={{ marginTop: 12 }}>
              {/* Existing thumbnails */}
              {n.attachments && n.attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {n.attachments.map(att => (
                    <div key={att.id} style={{ position: 'relative', width: 80 }}>
                      <a
                        href={att.signed_url ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'block', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}
                      >
                        <img
                          src={att.signed_url ?? ''}
                          alt={att.file_name ?? 'attachment'}
                          style={{ width: '100%', height: 'auto', display: 'block' }}
                        />
                      </a>
                      {confirmDeleteAttachmentId === att.id ? (
                        <div style={{
                          position: 'absolute', top: -8, right: -8,
                          background: 'var(--card-bg)', border: '1px solid var(--border)',
                          borderRadius: 8, padding: '4px 6px',
                          display: 'flex', gap: 4, alignItems: 'center',
                          boxShadow: '0 2px 8px rgba(44,26,14,0.15)',
                          whiteSpace: 'nowrap',
                        }}>
                          <button
                            onClick={() => { setConfirmDeleteAttachmentId(null); onDeleteAttachment(n.id, att.id) }}
                            disabled={deletingAttachmentId === att.id}
                            style={{ ...btnBase, fontSize: 11, padding: '2px 8px', background: '#c0392b', color: '#fff' }}
                          >
                            Hapus
                          </button>
                          <button
                            onClick={() => setConfirmDeleteAttachmentId(null)}
                            style={{ ...btnBase, fontSize: 11, padding: '2px 8px', background: 'var(--card-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteAttachmentId(att.id)}
                          disabled={deletingAttachmentId === att.id}
                          style={{
                            position: 'absolute', top: -6, right: -6,
                            width: 20, height: 20, borderRadius: '50%',
                            background: '#c0392b', color: '#fff',
                            border: 'none', cursor: 'pointer',
                            fontSize: 11, lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: deletingAttachmentId === att.id ? 0.5 : 1,
                          }}
                          title="Hapus foto"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload input */}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  disabled={uploadingNoteId === n.id}
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      onUploadAttachments(n.id, e.target.files)
                      e.target.value = ''
                    }
                  }}
                />
                <span style={{
                  fontFamily: 'Lora, serif',
                  fontSize: 12,
                  color: uploadingNoteId === n.id ? 'var(--text-muted)' : '#D4824A',
                  border: '1px solid #D4824A',
                  borderRadius: 6,
                  padding: '3px 10px',
                  opacity: uploadingNoteId === n.id ? 0.6 : 1,
                  transition: 'all 0.15s',
                }}>
                  {uploadingNoteId === n.id ? 'Mengunggah...' : '+ Foto'}
                </span>
              </label>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── NOTES FILTER ────────────────────────────────────────
function NotesFilter({ members, books, selectedMember, selectedBook, selectedBookTitle, onMemberChange, onBookChange, onBookTitleChange }: {
  members: AdminMember[]
  books: AdminBook[]
  selectedMember: string | null
  selectedBook: string | null
  selectedBookTitle: string | null
  onMemberChange: (id: string | null) => void
  onBookChange: (id: string | null) => void
  onBookTitleChange: (title: string | null) => void
}) {
  const [inputValue, setInputValue] = useState(selectedBookTitle || '')

  useEffect(() => {
    const timer = setTimeout(() => {
      onBookTitleChange(inputValue.trim() || null)
    }, 300)
    return () => clearTimeout(timer)
  }, [inputValue, onBookTitleChange])

  useEffect(() => {
    setInputValue(selectedBookTitle || '')
  }, [selectedBookTitle])

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
    minWidth: 200,
  }

  const hasActiveFilters = selectedMember || selectedBook || selectedBookTitle

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        {/* Book title search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Judul Buku:
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
              border: selectedBookTitle ? '1px solid var(--amber)' : '1px solid var(--border)',
              borderRadius: 8,
              padding: '4px 12px',
              outline: 'none',
              width: 200,
            }}
          />
          {selectedBookTitle && (
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Pembaca:
          </span>
          <select
            value={selectedMember || ''}
            onChange={e => onMemberChange(e.target.value || null)}
            style={selectStyle}
          >
            <option value="">Semua pembaca</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Buku:
          </span>
          <select
            value={selectedBook || ''}
            onChange={e => onBookChange(e.target.value || null)}
            style={selectStyle}
          >
            <option value="">Semua buku</option>
            {books.map(b => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => { onMemberChange(null); onBookChange(null); onBookTitleChange(null) }}
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

// ── EMPTY STATE ─────────────────────────────────────────
function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <p style={{ fontFamily: 'Crimson Pro, serif', fontSize: 16, color: 'var(--text-muted)', fontStyle: 'italic' }}>{text}</p>
    </div>
  )
}
