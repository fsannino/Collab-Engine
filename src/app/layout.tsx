import type { Metadata } from 'next'
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Collab:Evolve',
  description: 'Plataforma de orquestração de mudança organizacional — CollabZ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${dmSerif.variable}`}>
      <body style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{children}</body>
    </html>
  )
}
