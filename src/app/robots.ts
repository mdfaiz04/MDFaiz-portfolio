import type { MetadataRoute } from 'next'

import { searchIndexable } from '@/config/env'
import { absoluteUrl } from '@/lib/seo/site'

/**
 * robots.txt.
 *
 * Production invites crawlers. Preview deployments turn them away, because
 * every branch push creates a new public URL serving the same CV, and a
 * crawler that finds three copies picks one as canonical — possibly the
 * preview. Getting that wrong is quiet and expensive: the real site simply
 * stops ranking for its owner's own name.
 *
 * The sitemap is only advertised where indexing is actually allowed.
 */
export default function robots(): MetadataRoute.Robots {
  if (!searchIndexable) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  }
}
