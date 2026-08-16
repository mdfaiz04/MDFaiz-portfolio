import type { Metadata, Viewport } from 'next'
import { Archivo, JetBrains_Mono, Sora } from 'next/font/google'
import type { ReactNode } from 'react'

import { Footer } from '@/components/chrome/Footer'
import { Nav } from '@/components/chrome/Nav'
import { ScrollProgress } from '@/components/chrome/ScrollProgress'
import { profile, visibleSections } from '@/content'

import './globals.css'

/**
 * Fonts are downloaded at BUILD time and served from our own origin — there
 * is no request to Google at runtime, so the site makes zero third-party
 * requests and leaks nothing about visitors.
 *
 * Each exposes a CSS variable that globals.css maps onto a design token, so
 * components only ever name `font-display`, `font-body`, or `font-mono`.
 */
const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '600', '800'],
  variable: '--font-sora',
  display: 'swap',
})

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-archivo',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
})

/** Placeholder. Phase 6 derives all metadata from the content layer (R5). */
export const metadata: Metadata = {
  title: `${profile.name} — ${profile.role}`,
  description: profile.summary,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a16',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const fontVariables = `${sora.variable} ${archivo.variable} ${jetbrains.variable}`

  return (
    <html lang="en" className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">
        {/* R8 — keyboard users skip the nav without tabbing through it. */}
        <a
          href="#main"
          className="bg-accent text-ink sr-only rounded-edge px-4 py-2 font-mono text-xs focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100"
        >
          Skip to content
        </a>

        <ScrollProgress />
        <Nav items={visibleSections} wordmark={profile.name} />

        <div id="top" className="relative z-10 flex flex-1 flex-col">
          {children}
        </div>

        <Footer
          items={visibleSections}
          links={profile.links}
          owner={profile.name}
          year={2026}
        />
      </body>
    </html>
  )
}
