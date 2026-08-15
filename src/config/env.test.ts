import { describe, expect, it } from 'vitest'

import { env } from './env'

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
