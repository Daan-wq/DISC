import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'
import '../styles/tokens.css'
import Footer from '@/components/site/footer'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'DISC Profile Quiz',
  description: 'Professional DISC personality assessment',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className={inter.variable} data-scroll-behavior="smooth">
      <body className={`${inter.className} antialiased min-h-screen flex flex-col`}>
        <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 bg-primary text-primary-foreground px-3 py-2 rounded">Skip to content</a>
        <main id="content" className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
