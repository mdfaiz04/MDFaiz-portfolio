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

/**
 * `'true'`/`'false'` strings are the only way env vars can carry booleans.
 * Left optional here rather than defaulted, because "not set" and "set to
 * false" mean different things: unset defers to the deployment environment.
 */
const optionalBooleanFlag = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true'))

const schema = z.object({
  /** Absolute origin, used to build canonical URLs and OG image links. */
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  /** Injected by Vercel on every deployment; 'development' when running locally. */
  NEXT_PUBLIC_VERCEL_ENV: z
    .enum(['production', 'preview', 'development'])
    .default('development'),
  /** Manual override for search indexing. Unset means "decide from the env". */
  NEXT_PUBLIC_ALLOW_INDEXING: optionalBooleanFlag,
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
  NEXT_PUBLIC_VERCEL_ENV: absent(process.env.NEXT_PUBLIC_VERCEL_ENV),
  NEXT_PUBLIC_ALLOW_INDEXING: absent(process.env.NEXT_PUBLIC_ALLOW_INDEXING),
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

/**
 * Whether search engines may index this deployment.
 *
 * Preview deployments must not be indexed. Every branch push creates one, and
 * a crawler that finds three copies of the same CV on three URLs treats them
 * as duplicate content and picks a winner — which may not be the real site.
 * Production indexes; everything else does not; the flag overrides both.
 */
export const searchIndexable =
  env.NEXT_PUBLIC_ALLOW_INDEXING ?? env.NEXT_PUBLIC_VERCEL_ENV === 'production'

export type Env = typeof env
