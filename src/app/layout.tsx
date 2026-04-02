import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Silent Reading Club',
  description: 'Catatan bersama dari orang-orang yang suka baca.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
