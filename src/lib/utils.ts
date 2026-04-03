export function timeAgo(dateStr: string): string {
  // Append 'Z' to ensure date is parsed as UTC (Supabase stores in UTC)
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  if (diff < 172800) return 'kemarin'
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`
  if (diff < 2592000) return `${Math.floor(diff / 604800)} minggu lalu`
  return `${Math.floor(diff / 2592000)} bulan lalu`
}

export function avatarColor(name: string): string {
  const colors = [
    '#C4956A', '#8B5E3C', '#D4824A',
    '#6B3F1F', '#A07040', '#B87040',
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

export function initials(name: string): string {
  return name.charAt(0).toUpperCase()
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/`(.+?)`/g, '$1')
    .trim()
}
