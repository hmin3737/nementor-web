import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import DebugSession from '@/components/DebugSession'

export const metadata: Metadata = {
  title: '내멘토 — 나만의 입시 멘토',
  description: '검증된 멘토와 함께하는 입시 컨설팅 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#F7F5FF]">
        <Header />
        <main>{children}</main>
        <DebugSession />
      </body>
    </html>
  )
}
