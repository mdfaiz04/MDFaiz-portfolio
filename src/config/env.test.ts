import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { env, searchIndexable } from './env'

/** Re-evaluate env.ts against whatever process.env currently holds. */
async function loadEnvFresh() {
  vi.resetModules()
  return import('./env')
}

describe('environment contract', () => {
  it('parses with no .env file present', () => {
    expect(env).toBeDefined()
  })

  it('exposes a usable site URL', () => {
    expect(() => new URL(env.NEXT_PUBLIC_SITE_URL)).not.toThrow()
  })

  it('assumes a local development deployment by default', () => {
    expect(env.NEXT_PUBLIC_VERCEL_ENV).toBe('development')
  })

  it('does not invite crawlers into a local or preview build', () => {
    expect(searchIndexable).toBe(false)
  })
})

/**
 * Regression: hosting platforms inject declared-but-unset variables as empty
 * strings. That broke the first Vercel deploy — every field failed validation
 * because `.default()` only fires on `undefined`.
 */
describe('empty strings behave exactly like unset variables', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', '')
    vi.stubEnv('NEXT_PUBLIC_ALLOW_INDEXING', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('does not throw', async () => {
    await expect(loadEnvFresh()).resolves.toBeDefined()
  })

  it('falls back to the default site URL', async () => {
    const fresh = await loadEnvFresh()
    expect(() => new URL(fresh.env.NEXT_PUBLIC_SITE_URL)).not.toThrow()
  })

  it('falls back to a non-indexable development deployment', async () => {
    const fresh = await loadEnvFresh()
    expect(fresh.env.NEXT_PUBLIC_VERCEL_ENV).toBe('development')
    expect(fresh.searchIndexable).toBe(false)
  })
})

describe('deployment host is used when no explicit site URL is set', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('derives an https origin from the platform host', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_VERCEL_URL', 'md-faiz-portfolio.vercel.app')

    const fresh = await loadEnvFresh()
    expect(fresh.env.NEXT_PUBLIC_SITE_URL).toBe(
      'https://md-faiz-portfolio.vercel.app',
    )
  })

  it('prefers an explicitly configured site URL over the platform host', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com')
    vi.stubEnv('NEXT_PUBLIC_VERCEL_URL', 'md-faiz-portfolio.vercel.app')

    const fresh = await loadEnvFresh()
    expect(fresh.env.NEXT_PUBLIC_SITE_URL).toBe('https://example.com')
  })
})

/**
 * Preview deployments must not be indexed. Every branch push creates one at a
 * new public URL serving the same CV, and a crawler that finds several copies
 * chooses a canonical itself — which may not be the real site.
 */
describe('search indexing follows the deployment, not the developer', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('indexes production', async () => {
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production')
    expect((await loadEnvFresh()).searchIndexable).toBe(true)
  })

  it('refuses to index a preview deployment', async () => {
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview')
    expect((await loadEnvFresh()).searchIndexable).toBe(false)
  })

  it('lets the flag force indexing on', async () => {
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview')
    vi.stubEnv('NEXT_PUBLIC_ALLOW_INDEXING', 'true')
    expect((await loadEnvFresh()).searchIndexable).toBe(true)
  })

  it('lets the flag force indexing off, even in production', async () => {
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_ALLOW_INDEXING', 'false')
    expect((await loadEnvFresh()).searchIndexable).toBe(false)
  })
})
