import { palette } from './palette'

/**
 * The app mark, for the favicon and the home-screen icon.
 *
 * The same closed loop the nav draws (src/components/ui/Logo.tsx), rebuilt
 * from boxes because these render through Satori, which supports flexbox and
 * a subset of CSS — not arbitrary SVG paths.
 *
 * Two overlapping rings, one tipped each way, read as the same lemniscate at
 * icon size and survive being scaled to sixteen pixels, where a fine stroke
 * would disappear. Proportions are expressed against a 32-unit grid and
 * scaled, so one definition serves every icon size.
 */

const GRID = 32

export function Mark({ size }: { size: number }) {
  const unit = size / GRID
  const ring = 13 * unit
  const stroke = Math.max(1, 2.6 * unit)

  // The rings overlap by a stroke width, so the crossing reads as one line
  // passing through another rather than as two circles touching.
  const overlap = stroke * 1.6

  const ringStyle = {
    width: ring,
    height: ring,
    borderRadius: '50%',
    borderWidth: stroke,
    borderStyle: 'solid',
  } as const

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.ground,
        backgroundImage: `linear-gradient(140deg, ${palette.surface} 0%, ${palette.ground} 100%)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginLeft: -overlap / 2,
        }}
      >
        <div
          style={{
            ...ringStyle,
            borderColor: palette.accentBright,
            marginRight: -overlap,
          }}
        />
        <div
          style={{
            ...ringStyle,
            borderColor: palette.accentGlow,
          }}
        />
      </div>
    </div>
  )
}
