import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Collab Engine',
  description: 'Plataforma de orquestração de mudança organizacional — CollabZ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
