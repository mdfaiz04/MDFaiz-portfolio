# MD Faiz — Portfolio

A single-page portfolio for an AI & software engineer, built as a product
rather than a document. Dark, animated, and structured around one journey:
**attention → understanding → proof → interaction → connection.**

It costs nothing to run. There is no database, no API route, no third-party
script, and no service that can produce a bill.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

No `.env` file is needed. Every variable has a working default — see
[.env.example](.env.example) for the three that exist and what they do.

| Command                  | What it does                                          |
| ------------------------ | ----------------------------------------------------- |
| `npm run dev`            | Development server                                    |
| `npm run build`          | Production build (fails on any type or content error) |
| `npm start`              | Serve the production build                            |
| `npm test`               | Full test suite                                       |
| `npm run test:watch`     | Tests, re-run on change                               |
| `npm run typecheck`      | `tsc --noEmit`                                        |
| `npm run lint`           | ESLint, including the architectural rules below       |
| `npm run check:literals` | Scan components for content facts (rule R1)           |
| **`npm run verify`**     | **All of the above. Run this before pushing.**        |

A pre-commit hook runs `verify` automatically. If it blocks a commit, the
failure is real — fix it rather than passing `--no-verify`.

---

## Editing the site

**Everything a visitor reads lives in [`src/content/`](src/content/), and
nothing else.** Components render what they are given; they never contain a
fact. Change the CV here and the whole site follows — headings, counters,
timeline, projects, the assistant's answers, the search description, the
social card and the structured data all derive from these files.

| File                | Holds                                                       |
| ------------------- | ----------------------------------------------------------- |
| `profile.ts`        | Name, role, tagline, summary, location, links, availability |
| `experience.ts`     | Roles, dates, highlights, stack                             |
| `projects.ts`       | Problem → approach → outcome, stack, links                  |
| `skills.ts`         | Capability clusters, and the projects that evidence them    |
| `education.ts`      | Qualifications and scores                                   |
| `achievements.ts`   | Competition results                                         |
| `sections.ts`       | **The spine.** Section order, labels, and on/off switches   |
| `vocabulary.ts`     | Search synonyms for the assistant                           |
| `interpretation.ts` | How the assistant recognises a question                     |
| `schema.ts`         | The rules every file above must satisfy                     |
| `format.ts`         | Dates, durations and names, formatted for display           |

### Things that are derived, so never type them twice

Counters (`4 projects`, `15 technologies`), tenure (`6 months`), the nav, the
mobile menu, the footer, the scroll-spy, the sitemap, the keywords, the social
card, the JSON-LD graph, and every answer the assistant gives.

### Common edits

**Add a project** — append to `projects.ts`. It appears in the Projects
section, the counters move, the assistant can answer about it, a suggested
question for it appears, and it joins the structured data. No other file
changes.

**Add a repository link** — fill in that project's `links: []`. The card gets
a link, the assistant offers it, and the "code is not public yet" caveat it
currently admits to disappears on its own.

**Turn a section on or off** — flip `enabled` in `sections.ts`. It vanishes
from the page, the nav, the menu and the footer at once. (The `writing`
section is off, waiting for something to publish.)

**Retune the design** — [`src/app/globals.css`](src/app/globals.css) is the
only place colours, spacing and motion timings are defined. Changing a token
changes the site, the browser theme colour, the app icon and the social card,
because all four read from that file.

---

## Project layout

Four layers, and the dependency arrow only ever points one way:

**content → lib → components → app**

Nothing in `content/` knows a component exists. Nothing in `components/` knows
a fact. `app/` only composes.

```
src/
  app/            Routes and generated metadata. Composition only, no logic.
    layout.tsx      Fonts, metadata, structured data, page chrome
    page.tsx        Builds the view models and hands them to sections
    icon · apple-icon · opengraph-image     Generated at build time
    robots · sitemap                        Generated at build time

  content/        THE SOURCE OF TRUTH. Every fact about the owner.
    schema.ts       Zod contract — invalid content fails the build
    index.ts        The only entry point; validates on import
    derived.ts      Counters and lists computed from the above (R5)
    format.ts       Dates, durations and names formatted for display
    *.ts            profile, experience, projects, skills, education, …

  lib/            Logic that has nothing to do with React.
    assistant/      The in-browser retrieval engine
    seo/            Metadata and JSON-LD, derived from content
    brand/          The mark, and the design tokens read at build time
    visuals/        Canvas renderers: workstation, wave, runtime palette

  components/     Rendering. Holds no facts — the literal scan proves it.
    sections/       One per section of the page
    chrome/         Nav, footer, scroll progress
    ui/             Small shared pieces
    visuals/        Canvas hosts: lifecycle only, no drawing

  config/         Environment and motion tokens
  hooks/          Two: reduced motion, scroll spy

scripts/          Build-time tools (the literal scan, the logo generator)
docs/             Design and implementation documents
```

Tests sit next to what they test (`*.test.ts`), so a file and its proof move
together and nothing can be deleted while leaving its tests orphaned.

---

## The rules the build enforces

These are checked mechanically, not by review. Breaking one fails the build.

| #      | Rule                                             | Enforced by                  |
| ------ | ------------------------------------------------ | ---------------------------- |
| **R1** | No content facts in `src/components/`            | `scripts/check-literals.mjs` |
| **R2** | No raw colours or arbitrary values in components | ESLint                       |
| **R3** | No inline motion timings                         | ESLint                       |
| **R4** | `process.env` read only in `src/config/env.ts`   | ESLint                       |
| **R5** | Derived, never duplicated                        | Tests                        |
| **R6** | Strict types, `noUncheckedIndexedAccess`         | `tsc`                        |
| **R7** | Nothing metered — no dependency that can bill    | Review                       |
| **R8** | Accessible by default                            | Review + markup              |

Content is validated by Zod at import, so a malformed date or a skill citing
a project that does not exist **fails the build** rather than rendering as a
blank space in front of a recruiter.

---

## The assistant

`src/lib/assistant/` — a retrieval engine that runs entirely in the visitor's
browser. No API, no key, no model, nothing to rate-limit.

```
passages.ts       content → searchable documents
tokenize.ts       normalise, stem, expand synonyms
retrieve.ts       BM25 ranking
fuzzy.ts          typo repair, with the correction stated out loud
understand.ts     intent scoring: cues + entities + retrieval + shape
assess.ts         judgement, derived — each claim carries its evidence
explain.ts        long CV prose → short, plain lines
answer.ts         composition
suggest.ts        the opening questions, generated from content
```

It lives in the hero rather than in a section of its own: at the foot of the
page almost nobody reached it.

It **cannot invent a fact**, because there is no generative step to invent
with. When something is not in the portfolio it says so.

When it misunderstands a question, the fix is usually **one line of data** in
`src/content/interpretation.ts` — not a code change. Add the phrasing, add a
fixture in `src/lib/assistant/fixtures.test.ts`, done.

---

## Deploying

Push to `main`. Vercel builds and deploys.

Nothing needs configuring: the site URL is derived from the deployment host,
and `robots.txt` allows crawling on production while refusing it on preview
deployments — so branch previews never compete with the real site in search.

### With a custom domain

1. Add the domain in the Vercel project settings.
2. Set `NEXT_PUBLIC_SITE_URL` to it, so canonical URLs, the sitemap and the
   social card point at the domain rather than the `*.vercel.app` address.
3. Redeploy.

### Checking a deploy

- Social card: paste the URL into any chat, or open `/opengraph-image`
- Crawlers: `/robots.txt` and `/sitemap.xml`
- Structured data: paste the URL into Google's Rich Results Test

---

## Analytics

**Not installed, deliberately.** Every hosted analytics product is either
metered or a third-party script, and this site currently makes **zero
third-party requests** — fonts are self-hosted at build time, and nothing
about a visitor leaves their browser.

Vercel's dashboard already shows request volume with no code at all.

If you decide you want per-page analytics later, it is three lines:

```bash
npm install @vercel/analytics
```

```tsx
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/next'
// ...inside <body>, after <Footer />
;<Analytics />
```

That is free on Vercel's Hobby plan and cannot generate a bill — but it does
add a third-party request per visit, which is the trade being made.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4
(CSS-first tokens) · Zod · Vitest.

The hero's neural render is hand-written Canvas 2D — seeded so it is
identical on every load, and drawn from a carved anatomical model rather than
a particle cloud. See `src/lib/visuals/brain/`.
