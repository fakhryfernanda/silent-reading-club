import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Silent Reading Insights',
  description: 'Mengubah literasi menjadi inspirasi',
  openGraph: {
    title: 'Silent Reading Insights',
    description: 'Mengubah literasi menjadi inspirasi',
    siteName: 'Silent Reading Insights',
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Silent Reading Insights',
    description: 'Mengubah literasi menjadi inspirasi',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
