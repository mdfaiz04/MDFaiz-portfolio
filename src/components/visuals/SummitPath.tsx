/**
 * The journey, as a picture: a lit path winding up to a flag on a summit.
 *
 * Inline SVG rather than canvas, unlike the hero and the contact visuals.
 * Nothing here needs a render loop — the only motion is a glow travelling the
 * path, which CSS does on the compositor for nothing. That makes this a
 * Server Component shipping no JavaScript at all, which is the right trade
 * for a decoration at the top of a section.
 *
 * Colours are token references, so retuning the palette retunes this (R2).
 */
export function SummitPath() {
  return (
    <svg
      viewBox="0 0 420 210"
      role="img"
      aria-hidden="true"
      className="h-auto w-full"
    >
      <defs>
        <linearGradient id="summit-ridge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.5" />
          <stop
            offset="100%"
            stopColor="var(--color-accent-deep)"
            stopOpacity="0.05"
          />
        </linearGradient>

        <linearGradient id="summit-far" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="var(--color-accent-bright)"
            stopOpacity="0.22"
          />
          <stop
            offset="100%"
            stopColor="var(--color-accent-deep)"
            stopOpacity="0"
          />
        </linearGradient>

        <linearGradient id="summit-route" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-accent-glow)" />
          <stop offset="55%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-accent-bright)" />
        </linearGradient>

        <radialGradient id="summit-glow">
          <stop
            offset="0%"
            stopColor="var(--color-accent)"
            stopOpacity="0.45"
          />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Light behind the peak, so the ridge is lit from behind rather than
          sitting flat on the page. */}
      <ellipse cx="330" cy="70" rx="110" ry="70" fill="url(#summit-glow)" />

      {/* The far ridge, paler and lower — one silhouette reads as a shape,
          two read as distance. */}
      <path
        d="M188 168 L252 92 L286 128 L318 74 L364 168 Z"
        fill="url(#summit-far)"
      />

      {/* The summit itself. */}
      <path
        d="M228 172 L300 58 L332 96 L352 66 L412 172 Z"
        fill="url(#summit-ridge)"
      />
      <path
        d="M228 172 L300 58 L332 96 L352 66 L412 172"
        fill="none"
        stroke="var(--color-accent-bright)"
        strokeOpacity="0.55"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Snow on the two high faces. */}
      <path
        d="M300 58 L316 84 L300 92 L288 78 Z"
        fill="var(--color-accent-glow)"
        opacity="0.35"
      />

      {/* The route. One stroke from the bottom left to the flag, so the eye
          is led up it rather than across the picture. */}
      <path
        id="summit-track"
        d="M18 196 C 96 206, 128 176, 150 152 C 176 124, 214 132, 248 122 C 280 112, 292 92, 300 62"
        fill="none"
        stroke="url(#summit-route)"
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M18 196 C 96 206, 128 176, 150 152 C 176 124, 214 132, 248 122 C 280 112, 292 92, 300 62"
        fill="none"
        stroke="var(--color-scene-pulse)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="4 16"
        opacity="0.5"
        className="summit-spark"
      />

      {/* Waypoints, at the two turns of the path. */}
      <g>
        <path
          d="M60 150 a11 11 0 1 1 22 0 c0 8 -11 20 -11 20 s-11 -12 -11 -20 z"
          fill="var(--color-accent)"
          fillOpacity="0.28"
          stroke="var(--color-accent-bright)"
          strokeWidth="1.4"
        />
        <circle cx="71" cy="150" r="3.6" fill="var(--color-accent-glow)" />
      </g>

      <g>
        <path
          d="M146 108 a11 11 0 1 1 22 0 c0 8 -11 20 -11 20 s-11 -12 -11 -20 z"
          fill="var(--color-accent)"
          fillOpacity="0.28"
          stroke="var(--color-accent-bright)"
          strokeWidth="1.4"
        />
        <circle cx="157" cy="108" r="3.6" fill="var(--color-accent-glow)" />
      </g>

      {/* The flag at the top — the only element that is not on the way up. */}
      <line
        x1="300"
        y1="62"
        x2="300"
        y2="26"
        stroke="var(--color-accent-bright)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M300 28 L326 36 L300 46 Z" fill="var(--color-accent-bright)" />
      <circle cx="300" cy="62" r="3.4" fill="var(--color-scene-pulse)" />
    </svg>
  )
}
