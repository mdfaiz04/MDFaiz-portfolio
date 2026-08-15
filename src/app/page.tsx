import { env } from '@/config/env'

/**
 * Phase 0 placeholder. The real page is composed in Phase 3 and Phase 4 by
 * mapping over the section registry in src/content/sections.ts — there will
 * never be a hand-written list of sections here.
 *
 * This exists only to prove the shell renders and the environment contract
 * resolves. Everything visible on it is scaffolding.
 */
export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col gap-2 text-center">
        <p className="font-mono text-sm tracking-widest uppercase opacity-60">
          Phase 0
        </p>
        <h1 className="font-mono text-2xl font-bold tracking-tight">
          Foundation
        </h1>
        <p className="font-mono text-xs opacity-60">
          {new URL(env.NEXT_PUBLIC_SITE_URL).host}
        </p>
      </div>
    </main>
  )
}
