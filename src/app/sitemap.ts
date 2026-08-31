import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/lib/seo/site'

/**
 * The sitemap.
 *
 * One entry, because this is deliberately one page — the story runs top to
 * bottom and the sections are anchors, which a sitemap cannot address. A
 * fabricated list of `/#projects` URLs would only teach a crawler that this
 * site has five pages that all return the same document.
 *
 * `lastModified` is the build time, which for a statically generated site is
 * exactly when the content last changed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl('/'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
