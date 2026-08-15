import { z } from 'zod'

/**
 * The ONLY module in this project permitted to read `process.env`.
 * Everything else imports the parsed, typed `env` object below.
 * Enforced by the `no-restricted-syntax` rule in eslint.config.mjs.
 *
 * There are no secrets here. The portfolio calls no paid service, so a
 * fresh clone runs with no .env file and no configuration at all.
 */

/**
 * Hosting platforms inject declared-but-unset variables as EMPTY STRINGS
 * rather than leaving them undefined. Zod's `.default()` only triggers on
 * `undefined`, so an empty string would otherwise reach validation and fail.
 * Normalise first, then every default below behaves the same locally and in
 * production.
 */
const absent = (value: string | undefined): string | undefined =>
  value === undefined || value.trim() === '' ? undefined : value.trim()

/** `'true'`/`'false'` strings are the only way env vars can carry booleans. */
const booleanFlag = (fallback: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(fallback)
    .transform((value) => value === 'true')

const schema = z.object({
  /** Absolute origin, used to build canonical URLs and OG image links. */
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  /** Blog section is built but hidden until there is something to publish. */
  NEXT_PUBLIC_ENABLE_BLOG: booleanFlag('false'),
  /** Analytics stays off unless deliberately switched on. */
  NEXT_PUBLIC_ENABLE_ANALYTICS: booleanFlag('false'),
})

/**
 * Next.js only inlines `process.env.NEXT_PUBLIC_*` into the client bundle
 * when each variable is referenced as a literal member expression. Passing
 * `process.env` wholesale would compile to `undefined` in the browser, so
 * every key is spelled out explicitly here.
 */
const explicitSiteUrl = absent(process.env.NEXT_PUBLIC_SITE_URL)

/**
 * Vercel exposes the deployment host (no protocol) on every build. Using it
 * as the fallback keeps canonical URLs and OG images correct on preview and
 * production deployments with zero dashboard configuration — which is the
 * point: this project must deploy with nothing to set up.
 */
const vercelHost = absent(process.env.NEXT_PUBLIC_VERCEL_URL)
const derivedSiteUrl = vercelHost ? `https://${vercelHost}` : undefined

const runtimeEnv = {
  NEXT_PUBLIC_SITE_URL: explicitSiteUrl ?? derivedSiteUrl,
  NEXT_PUBLIC_ENABLE_BLOG: absent(process.env.NEXT_PUBLIC_ENABLE_BLOG),
  NEXT_PUBLIC_ENABLE_ANALYTICS: absent(
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
  ),
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
