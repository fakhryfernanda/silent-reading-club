'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { timeAgo, avatarColor, initials } from '@/lib/utils'
import BookFilters from '@/components/BookFilters'
import SearchableBookSelect from '@/components/SearchableBookSelect'
import SearchableMemberSelect from '@/components/SearchableMemberSelect'
import type { Attachment } from '@/lib/types'

type AdminMember = {
  id: string
  wa_phone: string
  display_name: string
  alias: string | null
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

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('books')
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(false)
  const [unauthorized, setUnauthorized] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [addForm, setAddForm] = useState<AddForm>(null)
  const [addValues, setAddValues] = useState<Record<string, string>>({})
  const [totalCounters, setTotalCounters] = useState({ books: 0, members: 0, notes: 0 })
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [allBookTypes, setAllBookTypes] = useState<string[]>([])
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
  }, [bookTypeFilter, bookReaderFilter, bookTitleFilter, noteMemberFilter, noteBookFilter])

  async function fetchData() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ key: keyRef.current })
      if (bookTypeFilter) params.set('bookType', bookTypeFilter)
      if (bookReaderFilter) params.set('bookReaderId', bookReaderFilter)
      if (bookTitleFilter) params.set('bookTitle', bookTitleFilter)
      if (noteMemberFilter) params.set('noteMemberId', noteMemberFilter)
      if (noteBookFilter) params.set('noteBookId', noteBookFilter)
      
      const res = await fetch(`/api/admin/data?${params.toString()}`)
      if (res.status === 401) {
        setUnauthorized(true)
        return
      }
      const json = await res.json()
      setData(json)
      // Only update total counters on initial load
      if (!initialLoadDone) {
        setTotalCounters({
          books: json.books.length,
          members: json.members.length,
          notes: json.notes.length,
        })
        // Store all book types from initial load
        const types = [...new Set(json.books.map((b: AdminBook) => b.type))]
          .filter((t): t is string => t !== null && t !== '')
        setAllBookTypes(types)
        setInitialLoadDone(true)
      }
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
      let body: Record<string, string | number | null> = {}
      let url = ''
      if (editTarget.type === 'members') {
        body = { display_name: editValues.display_name, wa_phone: editValues.wa_phone, alias: editValues.alias || null }
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
        // notes - sort_order is required, parse to integer
        const sortOrderInt = editValues.sort_order !== undefined && editValues.sort_order !== ''
          ? parseInt(editValues.sort_order)
          : null
        
        if (!sortOrderInt) {
          showError('Urutan catatan wajib diisi.')
          return
        }

        body = { content: editValues.content, sort_order: sortOrderInt }
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
        setTotalCounters(prev => ({
          ...prev,
          members: prev.members - 1,
          notes: prev.notes - (data.notes.filter(n => n.member_id === deletedId).length),
        }))
      } else if (deleteTarget.type === 'books') {
        const deletedId = deleteTarget.id
        setData(d => d ? {
          ...d,
          books: d.books.filter(b => b.id !== deletedId),
          notes: d.notes.filter(n => n.book_id !== deletedId),
        } : d)
        setTotalCounters(prev => ({
          ...prev,
          books: prev.books - 1,
          notes: prev.notes - (data.notes.filter(n => n.book_id === deletedId).length),
        }))
      } else {
        const deletedId = deleteTarget.id
        setData(d => d ? { ...d, notes: d.notes.filter(n => n.id !== deletedId) } : d)
        setTotalCounters(prev => ({
          ...prev,
          notes: prev.notes - 1,
        }))
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
        body = { wa_phone: addValues.wa_phone?.trim(), display_name: addValues.display_name?.trim(), alias: addValues.alias?.trim() || null }
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
        setTotalCounters(prev => ({
          ...prev,
          books: prev.books + 1,
        }))
        cancelAdd()
        return
      } else {
        url = '/api/admin/notes'
        body = {
          member_id: addValues.member_id,
          book_id: addValues.book_id,
          content: addValues.content?.trim(),
          raw_message: null,
          sort_order: addValues.sort_order?.trim() || null,
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
        setTotalCounters(prev => ({
          ...prev,
          members: prev.members + 1,
        }))
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
        setTotalCounters(prev => ({
          ...prev,
          notes: prev.notes + 1,
        }))
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
  if (unauthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <p className="font-lora text-[20px] text-brown-dark">Akses Ditolak</p>
        <p className="font-crimson text-[16px] text-muted">
          Pastikan URL mengandung <code>?key=...</code> yang benar.
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="font-crimson text-[18px] text-muted italic">
          Memuat data admin...
        </p>
      </div>
    )
  }

  const addLabel = tab === 'members' ? 'Anggota' : tab === 'books' ? 'Buku' : 'Catatan'
  const addFormType: AddForm = tab === 'members' ? 'member' : tab === 'books' ? 'book' : 'note'

  return (
    <div className="max-w-[860px] mx-auto px-7 py-10 pb-20">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-lora text-[26px] font-semibold text-brown-dark m-0">
          Admin — Silent Reading Club
        </h1>
        <div className="flex gap-5 mt-3">
          {[
            { label: 'Buku', count: totalCounters.books },
            { label: 'Pembaca', count: totalCounters.members },
            { label: 'Catatan', count: totalCounters.notes },
          ].map(s => (
            <span key={s.label} className="font-crimson text-[15px] text-muted">
              <strong className="text-accent">{s.count}</strong> {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="bg-[rgba(212,130,74,0.12)] border border-accent rounded-[8px] p-[10px_16px] mb-5 font-crimson text-[15px] text-brown-dark">
          {errorMessage}
        </div>
      )}

      {/* Tab bar + Add button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
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
                }
              }}
              className={`font-lora text-[13px] rounded-full cursor-pointer px-[18px] py-1.5 text-[14px] transition-all duration-150 ${
                tab === t
                  ? 'bg-accent text-white border-none'
                  : 'bg-cardBg text-muted border border-bookBorder'
              }`}
            >
              {t === 'members' ? 'Anggota' : t === 'books' ? 'Buku' : 'Catatan'}
            </button>
          ))}
        </div>
        <button
          onClick={() => addForm === addFormType ? cancelAdd() : openAddForm(addFormType)}
          className={`font-lora text-[13px] rounded-full cursor-pointer px-4 py-1.5 text-[14px] transition-all duration-150 ${
            addForm === addFormType
              ? 'bg-cardBg text-muted border border-bookBorder'
              : 'bg-brown-dark text-white border-none'
          }`}
        >
          {addForm === addFormType ? 'Batal Tambah' : `+ Tambah ${addLabel}`}
        </button>
      </div>

      {/* Add Form */}
      {addForm && (
        <div className="bg-cardBg border border-bookBorder rounded-[10px] p-[20px_24px] mb-5 border-l-4 border-l-accent">
          <p className="font-lora text-[14px] text-brown-mid m-0 mb-4">
            Tambah {addLabel} Baru
          </p>
          <div className="flex flex-col gap-3.5">
            {addForm === 'member' && (
              <>
                <FormField label="Nomor WA" value={addValues.wa_phone ?? ''} onChange={v => setAddValues(p => ({ ...p, wa_phone: v }))} placeholder="+628111..." />
                <FormField label="Nama Tampil" value={addValues.display_name ?? ''} onChange={v => setAddValues(p => ({ ...p, display_name: v }))} placeholder="Nama anggota" />
                <FormField label="Alias (opsional)" value={addValues.alias ?? ''} onChange={v => setAddValues(p => ({ ...p, alias: v }))} placeholder="Nama samaran untuk tampilan publik" />
              </>
            )}
            {addForm === 'book' && (
              <>
                <FormField label="Judul" value={addValues.title ?? ''} onChange={v => setAddValues(p => ({ ...p, title: v }))} placeholder="Judul buku / artikel / komik..." />
                <FormField label="Penulis (opsional)" value={addValues.author ?? ''} onChange={v => setAddValues(p => ({ ...p, author: v }))} placeholder="Nama penulis" />
                <div>
                  <label className="font-lora text-[12px] text-muted block mb-1">Tipe (opsional)</label>
                  <select
                    value={addValues.type ?? ''}
                    onChange={e => setAddValues(p => ({ ...p, type: e.target.value }))}
                    className="font-crimson text-[15px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 w-auto min-w-[160px]"
                  >
                    <option value="">— pilih tipe —</option>
                    {allBookTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-lora text-[12px] text-muted block mb-1">Cover (opsional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      addCoverRef.current = e.target.files?.[0] ?? null
                      setAddValues(p => ({ ...p, _coverName: e.target.files?.[0]?.name ?? '' }))
                    }}
                    className="font-crimson text-[14px] text-brown-dark"
                  />
                </div>
              </>
            )}
            {addForm === 'note' && (
              <>
                <div>
                  <label className="font-lora text-[12px] text-muted block mb-1">Anggota</label>
                  <select
                    value={addValues.member_id ?? ''}
                    onChange={e => setAddValues(p => ({ ...p, member_id: e.target.value }))}
                    className="font-crimson text-[15px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 w-auto min-w-[200px]"
                  >
                    <option value="">Pilih anggota...</option>
                    {data.members.map(m => (
                      <option key={m.id} value={m.id}>{m.display_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-lora text-[12px] text-muted block mb-1">Buku</label>
                  <SearchableBookSelect
                    books={data.books.map(b => ({ id: b.id, title: b.title }))}
                    value={addValues.book_id ?? ''}
                    onChange={v => {
                      setAddValues(p => ({ ...p, book_id: v }))
                      // Auto-calculate sort_order when book is selected
                      if (v) {
                        const bookNotes = data.notes.filter(n => n.book_id === v)
                        const maxOrder = bookNotes.reduce((max, n) => Math.max(max, n.sort_order ?? 0), 0)
                        setAddValues(p => ({ ...p, sort_order: String(maxOrder + 1) }))
                      } else {
                        setAddValues(p => ({ ...p, sort_order: '' }))
                      }
                    }}
                    selectedMemberId={addValues.member_id}
                    allNotes={data.notes}
                    placeholder="Cari buku..."
                    emptyLabel="Tidak ada buku ditemukan"
                  />
                </div>
                <div>
                  <label className="font-lora text-[12px] text-muted block mb-1">Catatan</label>
                  <textarea
                    value={addValues.content ?? ''}
                    onChange={e => setAddValues(p => ({ ...p, content: e.target.value }))}
                    placeholder="Tulis catatan..."
                    rows={6}
                    className="font-crimson text-[15px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 w-full resize-y"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="font-lora text-[12px] text-muted whitespace-nowrap">Urutan #</label>
                  <input
                    type="number"
                    min={1}
                    value={addValues.sort_order ?? ''}
                    onChange={e => setAddValues(p => ({ ...p, sort_order: e.target.value }))}
                    placeholder="Auto"
                    className="font-crimson text-[15px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 w-20 text-center"
                  />
                  <span className="font-crimson text-[12px] text-muted">
                    (kosongkan untuk otomatis)
                  </span>
                </div>
                <div>
                  <label className="font-lora text-[12px] text-muted block mb-1">Foto (opsional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => {
                      addFilesRef.current = e.target.files
                      setAddValues(p => ({ ...p, _fileCount: String(e.target.files?.length ?? 0) }))
                    }}
                    className="font-crimson text-[14px] text-brown-dark"
                  />
                  {addValues._fileCount && Number(addValues._fileCount) > 0 && (
                    <span className="font-crimson text-[13px] text-muted ml-2">
                      {addValues._fileCount} foto dipilih
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={submitAdd} 
              disabled={saving} 
              className={`font-lora text-[13px] rounded-full border-none cursor-pointer px-3 py-1 transition-all duration-150 bg-accent text-white hover:bg-brown-mid ${saving ? 'opacity-60' : ''}`}
            >
              Simpan
            </button>
            <button 
              onClick={cancelAdd} 
              className="font-lora text-[13px] rounded-full cursor-pointer px-3 py-1 transition-all duration-150 border border-accent text-accent bg-transparent hover:bg-accent hover:text-white"
            >
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
          loading={loading}
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
            types={allBookTypes}
            selectedType={bookTypeFilter}
            selectedReader={bookReaderFilter}
            selectedTitle={bookTitleFilter}
            onTypeChange={setBookTypeFilter}
            onReaderChange={setBookReaderFilter}
            onTitleChange={setBookTitleFilter}
            isCoverMode={false}
            onCoverModeChange={() => {}}
            hideCoverToggle={true}
          />
          <BooksList
            books={data.books}
            allBookTypes={allBookTypes}
            editTarget={editTarget}
            editValues={editValues}
            deleteTarget={deleteTarget}
            saving={saving}
            loading={loading}
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
            onMemberChange={setNoteMemberFilter}
            onBookChange={setNoteBookFilter}
          />
          <NotesList
            notes={data.notes}
            editTarget={editTarget}
            editValues={editValues}
            deleteTarget={deleteTarget}
            saving={saving}
            loading={loading}
            notePreview={notePreview}
            hasActiveFilters={!!noteMemberFilter || !!noteBookFilter}
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
      <label className="font-lora text-[12px] text-muted block mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-crimson text-[15px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 w-full"
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
      <div className="flex gap-1.5 shrink-0">
        <button 
          onClick={onSaveEdit} 
          disabled={saving} 
          className={`font-lora text-[13px] rounded-full border-none cursor-pointer px-3 py-1 transition-all duration-150 bg-accent text-white hover:bg-brown-mid ${saving ? 'opacity-60' : ''}`}
        >
          Simpan
        </button>
        <button 
          onClick={onCancelEdit} 
          className="font-lora text-[13px] rounded-full cursor-pointer px-3 py-1 transition-all duration-150 border border-accent text-accent bg-transparent hover:bg-accent hover:text-white"
        >
          Batal
        </button>
      </div>
    )
  }
  if (isDeleting) {
    return (
      <div className="flex gap-1.5 items-center shrink-0">
        <span className="font-crimson text-[13px] text-brown-mid">Hapus {deleteLabel}?</span>
        <button 
          onClick={onConfirmDelete} 
          disabled={saving} 
          className={`font-lora text-[13px] rounded-full border-none cursor-pointer px-3 py-1 transition-all duration-150 bg-accent text-white hover:bg-brown-mid ${saving ? 'opacity-60' : ''}`}
        >
          Ya, Hapus
        </button>
        <button 
          onClick={onCancelDelete} 
          className="font-lora text-[13px] rounded-full cursor-pointer px-3 py-1 transition-all duration-150 border border-accent text-accent bg-transparent hover:bg-accent hover:text-white"
        >
          Batal
        </button>
      </div>
    )
  }
  return (
    <div className="flex gap-1.5 shrink-0">
      <button 
        onClick={onEdit} 
        className="font-lora text-[13px] rounded-full cursor-pointer px-3 py-1 transition-all duration-150 bg-cardBg text-brown-mid border border-bookBorder hover:bg-brown-light hover:text-white"
      >
        Edit
      </button>
      <button 
        onClick={onDelete} 
        className="font-lora text-[13px] rounded-full cursor-pointer px-3 py-1 transition-all duration-150 bg-cardBg text-brown-mid border border-bookBorder hover:bg-danger hover:text-white"
      >
        Hapus
      </button>
    </div>
  )
}

// ── MEMBERS LIST ────────────────────────────────────────
function MembersList({ members, editTarget, editValues, deleteTarget, saving, loading, onEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete, onConfirmDelete, onCancelDelete }: {
  members: AdminMember[]
  editTarget: EditTarget
  editValues: Record<string, string>
  deleteTarget: DeleteTarget
  saving: boolean
  loading: boolean
  onEdit: (id: string, vals: Record<string, string>) => void
  onEditChange: (vals: Record<string, string>) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: (id: string, label: string) => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}) {
  if (members.length === 0 && !loading) {
    return <EmptyState text="Belum ada anggota." />
  }
  if (loading) {
    return (
      <div className="text-center py-5">
        <p className="font-crimson text-[18px] text-muted italic">
          Memuat data...
        </p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {members.map(m => {
        const isEditing = editTarget?.type === 'members' && editTarget.id === m.id
        const isDeleting = deleteTarget?.type === 'members' && deleteTarget.id === m.id
        return (
          <div key={m.id} className="bg-cardBg border border-bookBorder rounded-[10px] p-[16px_20px] border-l-4 border-l-accent flex items-start gap-3.5">
            <div 
              className="w-[42px] h-[42px] rounded-full shrink-0 flex items-center justify-center font-lora text-[15px] text-white font-semibold leading-[1]"
              style={{ background: avatarColor(m.alias || m.display_name) }}
            >
              {initials(m.alias || m.display_name)}
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={editValues.display_name ?? ''}
                    onChange={e => onEditChange({ ...editValues, display_name: e.target.value })}
                    className="font-crimson text-[16px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 w-full font-semibold mb-1.5"
                    autoFocus
                    placeholder="Nama tampil"
                  />
                  <input
                    type="text"
                    value={editValues.alias ?? ''}
                    onChange={e => onEditChange({ ...editValues, alias: e.target.value })}
                    className="font-crimson text-[14px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 w-full mb-1.5"
                    placeholder="Alias (opsional)"
                  />
                  <input
                    type="text"
                    value={editValues.wa_phone ?? ''}
                    onChange={e => onEditChange({ ...editValues, wa_phone: e.target.value })}
                    className="font-crimson text-[14px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 w-full mb-1"
                    placeholder="Nomor WA, cth: +628111..."
                  />
                </>
              ) : (
                <>
                  <p className="m-0 mb-0.5 font-lora text-[16px] text-brown-dark font-semibold">
                    {m.display_name}
                  </p>
                  {m.alias && (
                    <p className="m-0 mb-0.5 font-crimson text-[14px] text-accent italic">
                      {m.alias}
                    </p>
                  )}
                </>
              )}
              {!isEditing && (
                <p className="m-0 mb-0.5 font-crimson text-[14px] text-muted">
                  {m.wa_phone}
                </p>
              )}
              <p className="m-0 font-crimson text-[13px] text-muted">
                {m.note_count} catatan · bergabung {timeAgo(m.created_at)}
              </p>
            </div>
            <ActionButtons
              isEditing={isEditing}
              isDeleting={isDeleting}
              deleteLabel={`"${m.display_name}" + ${m.note_count} catatan`}
              saving={saving}
              onEdit={() => onEdit(m.id, { display_name: m.display_name, wa_phone: m.wa_phone, alias: m.alias ?? '' })}
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
function BooksList({ books, allBookTypes, editTarget, editValues, deleteTarget, saving, loading, onEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete, onConfirmDelete, onCancelDelete, hasActiveFilters, editCoverRef }: {
  books: AdminBook[]
  allBookTypes: string[]
  editTarget: EditTarget
  editValues: Record<string, string>
  deleteTarget: DeleteTarget
  saving: boolean
  loading: boolean
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
  if (books.length === 0 && !loading) {
    return <EmptyState text={hasActiveFilters ? "Tidak ada buku yang sesuai dengan filter." : "Belum ada buku."} />
  }
  if (loading) {
    return (
      <div className="text-center py-5">
        <p className="font-crimson text-[18px] text-muted italic">
          Memuat data...
        </p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {books.map(b => {
        const isEditing = editTarget?.type === 'books' && editTarget.id === b.id
        const isDeleting = deleteTarget?.type === 'books' && deleteTarget.id === b.id
        return (
          <div key={b.id} className="bg-cardBg border border-bookBorder rounded-[10px] p-[16px_20px] border-l-4 border-l-brown-light flex items-start gap-3.5">
            <div className="w-[38px] shrink-0">
              {b.cover_url ? (
                <img
                  src={b.cover_url}
                  alt={b.title}
                  className="w-[38px] h-auto rounded block object-cover"
                />
              ) : (
                <div className="w-[38px] h-[38px] rounded-md bg-brown-mid flex items-center justify-center font-lora text-[16px] text-white">
                  📖
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={editValues.title ?? ''}
                    onChange={e => onEditChange({ ...editValues, title: e.target.value })}
                    className="font-crimson text-[16px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 w-full font-semibold mb-1.5"
                    autoFocus
                    placeholder="Judul"
                  />
                  <input
                    type="text"
                    value={editValues.author ?? ''}
                    onChange={e => onEditChange({ ...editValues, author: e.target.value })}
                    className="font-crimson text-[14px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 w-full mb-1.5"
                    placeholder="Penulis (opsional)"
                  />
                  <select
                    value={editValues.type ?? ''}
                    onChange={e => onEditChange({ ...editValues, type: e.target.value })}
                    className="font-crimson text-[13px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 w-auto min-w-[140px]"
                  >
                    <option value="">— tipe —</option>
                    {allBookTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="mt-1.5">
                    <label className="font-lora text-[11px] text-muted block mb-0.5">
                      {b.cover_url ? 'Ganti cover' : 'Upload cover'} (opsional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => { editCoverRef.current = e.target.files?.[0] ?? null }}
                      className="font-crimson text-[13px] text-brown-dark"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="m-0 font-lora text-[16px] text-brown-dark font-semibold">
                      {b.title}
                    </p>
                    {b.type && (
                      <span className="font-lora text-[11px] text-accent border border-accent rounded-full px-2 py-0.5">
                        {b.type}
                      </span>
                    )}
                  </div>
                  <p className={`m-0 mb-0.5 font-crimson text-[14px] text-muted ${!b.author && 'italic'}`}>
                    {b.author ?? 'Penulis tidak diketahui'}
                  </p>
                </>
              )}
              <p className="m-0 font-crimson text-[13px] text-muted">
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
function NotesList({ notes, editTarget, editValues, deleteTarget, saving, loading, notePreview, onTogglePreview, onEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete, onConfirmDelete, onCancelDelete, hasActiveFilters, uploadingNoteId, deletingAttachmentId, onUploadAttachments, onDeleteAttachment }: {
  notes: AdminNote[]
  editTarget: EditTarget
  editValues: Record<string, string>
  deleteTarget: DeleteTarget
  saving: boolean
  loading: boolean
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

  if (notes.length === 0 && !loading) {
    return <EmptyState text={hasActiveFilters ? "Tidak ada catatan yang sesuai dengan filter." : "Belum ada catatan."} />
  }
  if (loading) {
    return (
      <div className="text-center py-5">
        <p className="font-crimson text-[18px] text-muted italic">
          Memuat data...
        </p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {notes.map(n => {
        const isEditing = editTarget?.type === 'notes' && editTarget.id === n.id
        const isDeleting = deleteTarget?.type === 'notes' && deleteTarget.id === n.id
        return (
          <div key={n.id} className="bg-cardBg border border-bookBorder rounded-[10px] p-[16px_20px] border-l-4 border-l-brown-light">
            <div className="flex justify-between items-start gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-lora text-[12px] text-white font-semibold leading-[1]"
                  style={{ background: avatarColor(n.member_name) }}
                >
                  {initials(n.member_name)}
                </div>
                <span className="font-lora text-[14px] text-brown-dark">
                  {n.member_name}
                </span>
                <span className="text-muted text-[13px]">→</span>
                <span className="font-crimson text-[14px] text-brown-mid italic">
                  {n.book_title}
                </span>
                <span className="font-crimson text-[13px] text-muted">
                  · {timeAgo(n.created_at)}
                </span>
                {!isEditing && (
                  <span className="font-lora text-[11px] text-brown-light border border-bookBorder rounded-full px-[7px] py-0.5 ml-1">
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
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { if (notePreview) onTogglePreview() }}
                      className={`font-lora text-[12px] rounded-full cursor-pointer px-2.5 py-0.5 transition-all duration-150 ${
                        !notePreview 
                          ? 'bg-brown-dark text-white border-none' 
                          : 'bg-cardBg text-muted border border-bookBorder'
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { if (!notePreview) onTogglePreview() }}
                      className={`font-lora text-[12px] rounded-full cursor-pointer px-2.5 py-0.5 transition-all duration-150 ${
                        notePreview 
                          ? 'bg-brown-dark text-white border-none' 
                          : 'bg-cardBg text-muted border border-bookBorder'
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="font-lora text-[12px] text-muted whitespace-nowrap">Urutan #</label>
                    <input
                      type="number"
                      min={1}
                      value={editValues.sort_order ?? ''}
                      onChange={e => onEditChange({ ...editValues, sort_order: e.target.value })}
                      className="font-crimson text-[15px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 w-[52px] text-center"
                    />
                  </div>
                </div>
                {notePreview ? (
                  <div className="note-content min-h-[80px] py-2">
                    <ReactMarkdown>{editValues.content ?? ''}</ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    value={editValues.content ?? ''}
                    onChange={e => onEditChange({ ...editValues, content: e.target.value })}
                    rows={5}
                    className="font-crimson text-[15px] text-brown-dark bg-transparent border-none border-b border-brown-light outline-none py-0.5 w-full resize-y"
                    autoFocus
                  />
                )}
              </>
            ) : (
              <p className="m-0 font-crimson text-[15px] text-brown-dark leading-[1.6] line-clamp-3">
                {n.content}
              </p>
            )}

            {/* Attachments section */}
            <div className="mt-3">
              {/* Existing thumbnails */}
              {n.attachments && n.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2.5">
                  {n.attachments.map(att => (
                    <div key={att.id} className="relative w-20">
                      <a
                        href={att.signed_url ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-md overflow-hidden border border-bookBorder"
                      >
                        <img
                          src={att.signed_url ?? ''}
                          alt={att.file_name ?? 'attachment'}
                          className="w-full h-auto block"
                        />
                      </a>
                      {confirmDeleteAttachmentId === att.id ? (
                        <div className="absolute -top-2 -right-2 bg-cardBg border border-bookBorder rounded-lg p-[4px_6px] flex gap-1 items-center shadow-[0_2px_8px_rgba(44,26,14,0.15)] whitespace-nowrap">
                          <button
                            onClick={() => { setConfirmDeleteAttachmentId(null); onDeleteAttachment(n.id, att.id) }}
                            disabled={deletingAttachmentId === att.id}
                            className="font-lora text-[11px] rounded-full border-none cursor-pointer px-2 py-0.5 bg-danger text-white"
                          >
                            Hapus
                          </button>
                          <button
                            onClick={() => setConfirmDeleteAttachmentId(null)}
                            className="font-lora text-[11px] rounded-full cursor-pointer px-2 py-0.5 bg-cardBg text-muted border border-bookBorder"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteAttachmentId(att.id)}
                          disabled={deletingAttachmentId === att.id}
                          className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white border-none cursor-pointer text-[11px] leading-[1] flex items-center justify-center ${deletingAttachmentId === att.id ? 'opacity-50' : ''}`}
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
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploadingNoteId === n.id}
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      onUploadAttachments(n.id, e.target.files)
                      e.target.value = ''
                    }
                  }}
                />
                <span 
                  className={`font-lora text-[12px] border border-accent rounded-md px-2.5 py-0.5 transition-all duration-150 ${
                    uploadingNoteId === n.id 
                      ? 'text-muted opacity-60' 
                      : 'text-accent hover:bg-accent hover:text-white'
                  }`}
                >
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
function NotesFilter({ members, books, selectedMember, selectedBook, onMemberChange, onBookChange }: {
  members: AdminMember[]
  books: AdminBook[]
  selectedMember: string | null
  selectedBook: string | null
  onMemberChange: (id: string | null) => void
  onBookChange: (id: string | null) => void
}) {
  const hasActiveFilters = selectedMember || selectedBook

  return (
    <div className="mb-5">
      <div className="flex flex-wrap gap-4 items-center">

        <div className="flex items-center gap-2">
          <span className="font-lora text-[12px] text-muted tracking-[0.1em] uppercase">
            Pembaca:
          </span>
          <div className="flex-1 max-w-[280px]">
            <SearchableMemberSelect
              members={members.map(m => ({ id: m.id, display_name: m.display_name }))}
              value={selectedMember || ''}
              onChange={v => onMemberChange(v || null)}
              placeholder="Semua pembaca"
              emptyLabel="Tidak ada pembaca ditemukan"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-[200px]">
          <span className="font-lora text-[12px] text-muted tracking-[0.1em] uppercase">
            Buku:
          </span>
          <div className="flex-1 max-w-[280px]">
            <SearchableBookSelect
              books={books.map(b => ({ id: b.id, title: b.title }))}
              value={selectedBook || ''}
              onChange={v => onBookChange(v || null)}
              placeholder="Semua buku"
              emptyLabel="Tidak ada buku ditemukan"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => { onMemberChange(null); onBookChange(null) }}
            className="font-lora text-[12px] px-3 py-1 rounded-full border border-accent bg-transparent text-accent cursor-pointer ml-auto hover:bg-accent hover:text-white transition-all duration-150"
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
    <div className="text-center py-5">
      <p className="font-crimson text-[18px] text-muted italic">{text}</p>
    </div>
  )
}

