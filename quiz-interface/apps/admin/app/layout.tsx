import type { ReactNode } from 'react'

import './globals.css'
import '../styles/tokens.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  )
}
