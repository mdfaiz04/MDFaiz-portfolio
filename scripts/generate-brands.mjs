import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import * as icons from 'simple-icons'

/**
 * Generate src/content/brands.ts from Simple Icons.
 *
 * Run with `npm run generate:brands` after adding a technology below.
 *
 * The generated file is COMMITTED and simple-icons is a devDependency, so
 * nothing ships to the browser except the handful of path strings actually
 * used. Importing the library at runtime would pull three thousand logos into
 * the bundle to draw twelve.
 *
 * `technology` must match a technology name in src/content exactly. The
 * strip renders only marks whose technology genuinely appears in the CV, so
 * a logo for something unused can never reach the page — but keeping the
 * names in step here avoids a silently missing logo.
 *
 * Order is deliberate: it is the order the strip renders in, most
 * representative first. Simple Icons is CC0.
 */
const WANTED = [
  ['Python', 'siPython'],
  ['FastAPI', 'siFastapi'],
  ['PostgreSQL', 'siPostgresql'],
  ['MongoDB', 'siMongodb'],
  ['Docker', 'siDocker'],
  ['Next.js', 'siNextdotjs'],
  ['React', 'siReact'],
  ['TypeScript', 'siTypescript'],
  ['Node.js', 'siNodedotjs'],
  ['OpenCV', 'siOpencv'],
  ['Git', 'siGit'],
  ['Linux', 'siLinux'],
]

const entries = WANTED.map(([technology, key]) => {
  const icon = icons[key]
  if (!icon) throw new Error(`Simple Icons has no export "${key}"`)
  return { technology, title: icon.title, hex: `#${icon.hex}`, path: icon.path }
})

const body = entries
  .map(
    (entry) =>
      `  {\n` +
      `    technology: ${JSON.stringify(entry.technology)},\n` +
      `    hex: ${JSON.stringify(entry.hex)},\n` +
      `    path: ${JSON.stringify(entry.path)},\n` +
      `  },`,
  )
  .join('\n')

const file = `import type { BrandMark } from './schema'

/**
 * Brand marks for the technologies the CV names.
 *
 * GENERATED — do not edit by hand. Run \`npm run generate:brands\` after
 * changing the list in scripts/generate-brands.mjs.
 *
 * Paths come from Simple Icons (CC0), extracted at build time so the browser
 * receives twelve path strings rather than a three-thousand-logo library.
 *
 * A mark here only reaches the page if its technology actually appears in
 * src/content — see the referential check in index.ts. The order below is the
 * order the strip renders in.
 */
export const brands = [
${body}
] satisfies BrandMark[]
`

writeFileSync(join(process.cwd(), 'src/content/brands.ts'), file, 'utf8')
console.log(`brands.ts: ${entries.length} marks written.`)
