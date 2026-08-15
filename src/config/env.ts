import { z } from 'zod'

/**
 * The ONLY module in this project permitted to read `process.env`.
 * Everything else imports the parsed, typed `env` object below.
 * Enforced by the `no-restricted-syntax` rule in eslint.config.mjs.
 *
 * There are no secrets here. The portfolio calls no paid service, so a
 * fresh clone runs with no .env file and no configuration at all.
 */

/** `'true'`/`'false'` strings are the only way env vars can carry booleans. */
const booleanFromString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')

const schema = z.object({
  /** Absolute origin, used to build canonical URLs and OG image links. */
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  /** Blog section is built but hidden until there is something to publish. */
  NEXT_PUBLIC_ENABLE_BLOG: booleanFromString.default(false),
  /** Analytics stays off unless deliberately switched on. */
  NEXT_PUBLIC_ENABLE_ANALYTICS: booleanFromString.default(false),
})

/**
 * Next.js only inlines `process.env.NEXT_PUBLIC_*` into the client bundle
 * when each variable is referenced as a literal member expression. Passing
 * `process.env` wholesale would compile to `undefined` in the browser, so
 * every key is spelled out explicitly here.
 */
const runtimeEnv = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_ENABLE_BLOG: process.env.NEXT_PUBLIC_ENABLE_BLOG,
  NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
}

const parsed = schema.safeParse(runtimeEnv)

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n')

  throw new Error(
    `Invalid environment configuration.\n${detail}\n\n` +
      `Fix the values above, or remove them to fall back to defaults.`,
  )
}

export const env = parsed.data

export type Env = typeof env
