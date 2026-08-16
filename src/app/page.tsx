import { counts, experienceSince, profile, visibleSections } from '@/content'

/**
 * Phase 1 placeholder. The real page is composed in Phase 3 and Phase 4 by
 * mapping over the section registry — there will never be a hand-written
 * list of sections here.
 *
 * It renders live content so the layer is proven end to end: every value
 * below comes from src/content, and the counters are derived, not typed.
 */
export default function HomePage() {
  // Time-dependent, so it is read here in a Server Component and passed as a
  // plain value. Reading the clock in a Client Component would produce a
  // different result on the server than in the browser.
  const tenure = experienceSince(new Date())

  const stats = [
    { label: 'experience', value: tenure.label },
    { label: 'projects', value: String(counts.projects) },
    { label: 'technologies', value: String(counts.technologies) },
    { label: 'placements', value: String(counts.placements) },
  ]

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-mono text-xs tracking-widest uppercase opacity-60">
          {profile.role}
        </p>
        <h1 className="font-mono text-3xl font-bold tracking-tight">
          {profile.name}
        </h1>
        <p className="max-w-md text-sm opacity-70">{profile.tagline}</p>
      </div>

      <dl className="flex flex-wrap justify-center gap-x-8 gap-y-3 font-mono text-xs">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-1">
            <dt className="tracking-widest uppercase opacity-50">
              {stat.label}
            </dt>
            <dd className="text-base font-bold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <nav className="flex flex-wrap justify-center gap-4 font-mono text-xs opacity-60">
        {visibleSections.map((section) => (
          <span key={section.id}>{section.navLabel}</span>
        ))}
      </nav>
    </main>
  )
}
