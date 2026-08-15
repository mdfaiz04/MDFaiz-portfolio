import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

/**
 * Placeholder metadata. Phase 6 derives all of this from the content layer
 * (R5), at which point nothing here is written by hand.
 */
export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Portfolio site.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

/**
 * Typed explicitly rather than with Next's generated `LayoutProps`, so that
 * `tsc --noEmit` passes on a clean checkout without a build step first.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
