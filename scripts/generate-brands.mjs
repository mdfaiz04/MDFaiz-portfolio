import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import * as icons from 'simple-icons'

/**
 * Generate the brand-mark data files from Simple Icons.
 *
 * Run with `npm run generate:brands` after adding an entry below.
 *
 * The generated files are COMMITTED and simple-icons is a devDependency, so
 * nothing ships to the browser except the handful of path strings actually
 * used. Importing the library at runtime would pull three thousand logos into
 * the bundle to draw a dozen.
 *
 * Simple Icons is CC0.
 */

/**
 * Technology logos, for the hero's toolkit strip.
 *
 * `technology` must match a technology name in src/content exactly. The strip
 * renders only marks whose technology genuinely appears in the CV, so a logo
 * for something unused can never reach the page — but keeping the names in
 * step here avoids a silently missing logo.
 *
 * Order is deliberate: it is the order the strip renders in.
 */
const TECHNOLOGIES = [
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

/**
 * Profile logos, for the contact section.
 *
 * Matched to a link by the HOST of its URL rather than by its label: a label
 * is free text, and renaming one should never silently drop its logo.
 *
 * LinkedIn carries its path inline because Simple Icons no longer ships it.
 */
const SOCIALS = [
  { host: 'github.com', icon: 'siGithub' },
  {
    host: 'linkedin.com',
    title: 'LinkedIn',
    hex: '#0A66C2',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
]

const NL = '\n'

function resolve(key) {
  const icon = icons[key]
  if (!icon) throw new Error(`Simple Icons has no export "${key}"`)
  return { title: icon.title, hex: `#${icon.hex}`, path: icon.path }
}

/** One object literal per entry, keys in the order given. */
function serialise(rows, keys) {
  return rows
    .map((row) => {
      const fields = keys
        .map((key) => `    ${key}: ${JSON.stringify(row[key])},`)
        .join(NL)
      return `  {${NL}${fields}${NL}  },`
    })
    .join(NL)
}

function write(file, header, rows, keys, exportName, type) {
  const body = serialise(rows, keys)
  const contents = [
    `import type { ${type} } from './schema'`,
    '',
    header,
    `export const ${exportName} = [`,
    body,
    `] satisfies ${type}[]`,
    '',
  ].join(NL)

  writeFileSync(join(process.cwd(), 'src/content', file), contents, 'utf8')
  console.log(`${file}: ${rows.length} marks written.`)
}

const technologies = TECHNOLOGIES.map(([technology, key]) => ({
  technology,
  ...resolve(key),
}))

const socials = SOCIALS.map((entry) =>
  entry.icon
    ? { host: entry.host, ...resolve(entry.icon) }
    : {
        host: entry.host,
        title: entry.title,
        hex: entry.hex,
        path: entry.path,
      },
)

write(
  'brands.ts',
  [
    '/**',
    ' * Brand marks for the technologies the CV names.',
    ' *',
    ' * GENERATED — do not edit by hand. Run `npm run generate:brands` after',
    ' * changing the list in scripts/generate-brands.mjs.',
    ' *',
    ' * Paths come from Simple Icons (CC0), extracted at build time so the',
    ' * browser receives a dozen path strings rather than a three-thousand-logo',
    ' * library.',
    ' *',
    ' * A mark here only reaches the page if its technology actually appears in',
    ' * src/content. The order below is the order the strip renders in.',
    ' */',
  ].join(NL),
  technologies,
  ['technology', 'hex', 'path'],
  'brands',
  'BrandMark',
)

write(
  'socials.ts',
  [
    '/**',
    ' * Logos for the profiles the contact section links to.',
    ' *',
    ' * GENERATED — do not edit by hand. Run `npm run generate:brands` after',
    ' * changing the list in scripts/generate-brands.mjs.',
    ' *',
    ' * Matched to a link by the host of its URL, so renaming a label can never',
    ' * silently drop its logo. A mark with no matching link never renders.',
    ' */',
  ].join(NL),
  socials,
  ['host', 'title', 'hex', 'path'],
  'socials',
  'SocialMark',
)
