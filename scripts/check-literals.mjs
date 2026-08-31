#!/usr/bin/env node
/**
 * R1 — no facts about the owner may live inside components.
 *
 * Components render data; they never contain it. This scans src/components
 * for the shapes a hard-coded fact takes: prose, an email, a URL, a date, or
 * a hex colour. Anything it finds belongs in src/content or a design token.
 *
 * Escape hatch: put `@allow-literal` in a comment on the line above, for the
 * genuine exceptions (a visually-hidden label, an aria string).
 *
 * Deliberately heuristic. It is a gate against drift, not a parser.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const SCAN_DIR = join(ROOT, 'src', 'components')
const EXTENSIONS = new Set(['.tsx', '.ts'])
const ALLOW_MARKER = '@allow-literal'

/** Each rule reports the first match on a line. */
const RULES = [
  {
    id: 'email',
    test: /[\w.+-]+@[\w-]+\.[\w.]{2,}/,
    hint: 'Move the address to src/content/profile.ts.',
  },
  {
    id: 'url',
    test: /https?:\/\/[^\s"'`)]+/,
    hint: 'Move the link to src/content and pass it in as a prop.',
  },
  {
    id: 'iso-date',
    test: /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])\b/,
    hint: 'Dates belong in src/content, formatted by src/content/format.ts.',
  },
  {
    id: 'written-date',
    test: /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(?:19|20)\d{2}\b/,
    hint: 'Dates belong in src/content, formatted by src/content/format.ts.',
  },
  {
    id: 'hex-colour',
    test: /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/,
    hint: 'Colours are design tokens. Add one in globals.css.',
  },
]

/** JSX text with four or more words is prose, i.e. content. */
const PROSE_MIN_WORDS = 4

function walk(dir) {
  let files = []
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return files // directory does not exist yet — nothing to check
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files = files.concat(walk(full))
    } else if (EXTENSIONS.has(entry.slice(entry.lastIndexOf('.')))) {
      files.push(full)
    }
  }
  return files
}

/**
 * Strip the parts of a line that legitimately contain long strings:
 * className values (Tailwind), import paths, and comments.
 */
function strippable(line) {
  return (
    line
      .replace(/className\s*=\s*(?:"[^"]*"|'[^']*'|\{[^}]*\})/g, '')
      .replace(/\bfrom\s+['"][^'"]+['"]/g, '')
      .replace(/\bimport\s*\(['"][^'"]+['"]\)/g, '')
      // Only a `//` that is NOT part of a protocol starts a comment.
      // Without the lookbehind, `https://…` swallows the rest of the line
      // and hides every finding after it.
      .replace(/(?<!:)\/\/.*$/, '')
  )
}

/**
 * Remove block comments, including ones that span several lines.
 *
 * Returns the surviving text and whether a comment is still open, so the
 * caller can carry that state to the next line. Without it, a JSX comment
 * that explains markup reads as prose sitting between two tags and fails the
 * scan. A comment is never content, whatever it happens to mention.
 */
function stripBlockComments(line, open) {
  let out = ''
  let index = 0

  while (index < line.length) {
    if (open) {
      const end = line.indexOf('*/', index)
      if (end === -1) break
      index = end + 2
      open = false
    } else {
      const start = line.indexOf('/*', index)
      if (start === -1) {
        out += line.slice(index)
        break
      }
      out += line.slice(index, start)
      index = start + 2
      open = true
    }
  }

  return { text: out, open }
}

/** Detect prose sitting between JSX tags, e.g. `<p>Hello there friend now</p>`. */
function findProse(line) {
  const matches = line.matchAll(/>([^<>{}]{12,})</g)
  for (const match of matches) {
    const text = match[1].trim()
    if (!text) continue
    const words = text.split(/\s+/).filter((w) => /[A-Za-z]/.test(w))
    if (words.length >= PROSE_MIN_WORDS) return text
  }
  return null
}

const findings = []
const files = walk(SCAN_DIR)

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)

  // Block comments carry across lines, so the state has to as well.
  let openComment = false

  lines.forEach((rawLine, index) => {
    const stripped = stripBlockComments(rawLine, openComment)
    openComment = stripped.open

    const previous = index > 0 ? lines[index - 1] : ''
    if (rawLine.includes(ALLOW_MARKER) || previous.includes(ALLOW_MARKER))
      return

    const line = strippable(stripped.text)
    if (!line.trim()) return

    // Report every rule a line breaks, not just the first — one line can
    // carry an email and a date, and fixing one at a time is tedious.
    for (const rule of RULES) {
      const match = line.match(rule.test)
      if (match) {
        findings.push({
          file,
          line: index + 1,
          id: rule.id,
          text: match[0],
          hint: rule.hint,
        })
      }
    }

    const prose = findProse(line)
    if (prose) {
      findings.push({
        file,
        line: index + 1,
        id: 'prose',
        text: prose,
        hint: 'Sentences belong in src/content and arrive as props.',
      })
    }
  })
}

const scanned = `${files.length} file${files.length === 1 ? '' : 's'}`

if (findings.length === 0) {
  console.log(`R1 literal scan: clean (${scanned} in src${sep}components).`)
  process.exit(0)
}

console.error(`\nR1 literal scan failed — ${findings.length} finding(s):\n`)
for (const f of findings) {
  console.error(`  ${relative(ROOT, f.file)}:${f.line}  [${f.id}]`)
  console.error(`    found: ${f.text.slice(0, 80)}`)
  console.error(`    fix:   ${f.hint}\n`)
}
console.error(
  `Components render data; they never contain it.\n` +
    `Genuine exceptions: add a "${ALLOW_MARKER}" comment above the line.\n`,
)
process.exit(1)
