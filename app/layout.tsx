import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BACKMAN - 業務管理システム',
  description: 'BACKMANスタッフ向け業務報告・管理システム',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${geist.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
