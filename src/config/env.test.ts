import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { env } from './env'

/** Re-evaluate env.ts against whatever process.env currently holds. */
async function loadEnvFresh() {
  vi.resetModules()
  const reloaded = await import('./env')
  return reloaded.env
}

describe('environment contract', () => {
  it('parses with no .env file present', () => {
    expect(env).toBeDefined()
  })

  it('exposes a usable site URL', () => {
    expect(() => new URL(env.NEXT_PUBLIC_SITE_URL)).not.toThrow()
  })

  it('turns string flags into real booleans', () => {
    expect(typeof env.NEXT_PUBLIC_ENABLE_BLOG).toBe('boolean')
    expect(typeof env.NEXT_PUBLIC_ENABLE_ANALYTICS).toBe('boolean')
  })

  it('ships both optional features switched off by default', () => {
    expect(env.NEXT_PUBLIC_ENABLE_BLOG).toBe(false)
    expect(env.NEXT_PUBLIC_ENABLE_ANALYTICS).toBe(false)
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
    vi.stubEnv('NEXT_PUBLIC_ENABLE_BLOG', '')
    vi.stubEnv('NEXT_PUBLIC_ENABLE_ANALYTICS', '')
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
    expect(() => new URL(fresh.NEXT_PUBLIC_SITE_URL)).not.toThrow()
  })

  it('falls back to both flags being off', async () => {
    const fresh = await loadEnvFresh()
    expect(fresh.NEXT_PUBLIC_ENABLE_BLOG).toBe(false)
    expect(fresh.NEXT_PUBLIC_ENABLE_ANALYTICS).toBe(false)
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
    expect(fresh.NEXT_PUBLIC_SITE_URL).toBe(
      'https://md-faiz-portfolio.vercel.app',
    )
  })

  it('prefers an explicitly configured site URL over the platform host', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com')
    vi.stubEnv('NEXT_PUBLIC_VERCEL_URL', 'md-faiz-portfolio.vercel.app')

    const fresh = await loadEnvFresh()
    expect(fresh.NEXT_PUBLIC_SITE_URL).toBe('https://example.com')
  })
})
