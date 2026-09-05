/**
 * The toolkit, as a picture: a layered core with capabilities in orbit.
 *
 * Inline SVG rather than canvas, for the same reason as the summit — the only
 * motion is two rings turning, which CSS does on the compositor. A Server
 * Component shipping no JavaScript.
 *
 * The layers are drawn as isometric rhombuses rather than as a perspective
 * projection: at this size a true vanishing point is invisible, and an
 * isometric stack has the clearer silhouette.
 *
 * Colours are token references, so retuning the palette retunes this (R2).
 */

/** One face of the stack. `y` is the height of its top surface. */
function Layer({ y, opacity }: { y: number; opacity: number }) {
  const halfWidth = 66
  const halfDepth = 34
  const thickness = 20

  return (
    <g opacity={opacity}>
      {/* Front-left and front-right walls, the darker of the three faces. */}
      <path
        d={`M${210 - halfWidth} ${y} L210 ${y + halfDepth} L210 ${y + halfDepth + thickness} L${210 - halfWidth} ${y + thickness} Z`}
        fill="var(--color-accent-deep)"
      />
      <path
        d={`M${210 + halfWidth} ${y} L210 ${y + halfDepth} L210 ${y + halfDepth + thickness} L${210 + halfWidth} ${y + thickness} Z`}
        fill="var(--color-accent)"
        fillOpacity="0.55"
      />
      {/* The lit top. */}
      <path
        d={`M210 ${y - halfDepth} L${210 + halfWidth} ${y} L210 ${y + halfDepth} L${210 - halfWidth} ${y} Z`}
        fill="url(#stack-face)"
        stroke="var(--color-accent-bright)"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
    </g>
  )
}

/** A capability, riding its orbit. */
function Node({
  x,
  y,
  children,
}: {
  x: number
  y: number
  children: React.ReactNode
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle
        r="26"
        fill="var(--color-surface)"
        stroke="var(--color-accent-bright)"
        strokeOpacity="0.55"
        strokeWidth="1.4"
      />
      <g
        stroke="var(--color-accent-bright)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {children}
      </g>
    </g>
  )
}

export function DataStack() {
  return (
    <svg
      viewBox="0 0 420 260"
      role="img"
      aria-hidden="true"
      className="h-auto w-full"
    >
      <defs>
        <linearGradient id="stack-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-bright)" />
          <stop offset="100%" stopColor="var(--color-accent-deep)" />
        </linearGradient>

        <radialGradient id="stack-glow">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="210" cy="140" rx="150" ry="90" fill="url(#stack-glow)" />

      {/* Two orbits, tilted apart so they read as three-dimensional rather
          than as concentric circles. */}
      <g
        fill="none"
        stroke="var(--color-accent-bright)"
        strokeOpacity="0.35"
        strokeDasharray="3 7"
      >
        <ellipse
          cx="210"
          cy="140"
          rx="148"
          ry="52"
          className="orbit-slow"
          style={{ transformOrigin: '210px 140px' }}
        />
        <ellipse
          cx="210"
          cy="140"
          rx="120"
          ry="76"
          transform="rotate(-14 210 140)"
          className="orbit-slow-reverse"
          style={{ transformOrigin: '210px 140px' }}
        />
      </g>

      {/* Bottom layer first: later layers must paint over earlier ones. */}
      <Layer y={168} opacity={0.55} />
      <Layer y={140} opacity={0.75} />
      <Layer y={112} opacity={1} />

      {/* The four capability marks, at the corners of the orbits. */}
      <Node x={68} y={62}>
        <path d="M-7 -5 L-12 0 L-7 5" />
        <path d="M7 -5 L12 0 L7 5" />
      </Node>

      <Node x={356} y={54}>
        <ellipse cx="0" cy="-6" rx="9" ry="4" />
        <path d="M-9 -6 v12 a9 4 0 0 0 18 0 v-12" />
        <path d="M-9 0 a9 4 0 0 0 18 0" />
      </Node>

      <Node x={54} y={196}>
        <path d="M-4 5 a7 7 0 0 1 0 -13 a9 9 0 0 1 17 -2 a6 6 0 0 1 1 15 z" />
      </Node>

      <Node x={358} y={192}>
        <path d="M0 -9 a5 5 0 0 1 5 5 a5 5 0 0 1 3 8 a5 5 0 0 1 -8 5 a5 5 0 0 1 -8 -5 a5 5 0 0 1 3 -8 a5 5 0 0 1 5 -5 z" />
        <path d="M0 -4 v12" />
      </Node>
    </svg>
  )
}
