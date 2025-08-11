import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Verbio - Voice Translation App',
  description: 'Ultra-modern voice translation application with 3D listening orb and cutting-edge UI/UX',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}