import { ImageResponse } from 'next/og'

import { profile } from '@/content'
import { palette } from '@/lib/brand/tokens'
import { cardAlt, cardStats, sectionTrail, siteUrl } from '@/lib/seo/site'

/**
 * The social card.
 *
 * Generated at BUILD time into a static PNG — no request-time work, nothing
 * metered, no image service. It is the first thing anyone sees when this link
 * is pasted into a chat, an email, or a LinkedIn message, which for a
 * portfolio makes it the most-viewed surface on the site.
 *
 * Every string and every number is read from the content layer, and the
 * colours are read from globals.css, so the card cannot drift out of step
 * with the page it advertises.
 *
 * Satori (which renders this) supports flexbox and a subset of CSS only —
 * no grid, no filters. Hence the plain nested flex layout below.
 */

export const alt = cardAlt
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'

export default function Image() {
  const host = siteUrl.replace(/^https?:\/\//, '')

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        backgroundColor: palette.ground,
        backgroundImage: `linear-gradient(135deg, ${palette.groundDeep} 0%, ${palette.ground} 55%, ${palette.surface} 100%)`,
        color: palette.ink,
      }}
    >
      {/* Eyebrow: the role, and a rule that runs to the edge. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 22,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: palette.accentBright,
          }}
        >
          {profile.role}
        </div>
        <div
          style={{
            flex: 1,
            height: 1,
            backgroundColor: palette.rule,
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div
          style={{
            fontSize: 108,
            fontWeight: 700,
            letterSpacing: -3,
            lineHeight: 1.05,
          }}
        >
          {profile.name}
        </div>
        <div
          style={{
            fontSize: 38,
            lineHeight: 1.3,
            color: palette.inkMuted,
            maxWidth: 900,
          }}
        >
          {profile.tagline}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 56 }}>
          {cardStats.map((stat) => (
            <div
              key={stat.label}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  color: palette.accentGlow,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 18,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: palette.inkFaint,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8,
            fontFamily: MONO,
            fontSize: 20,
            color: palette.inkFaint,
          }}
        >
          <div style={{ color: palette.accentBright }}>{host}</div>
          <div>{sectionTrail}</div>
        </div>
      </div>
    </div>,
    size,
  )
}
