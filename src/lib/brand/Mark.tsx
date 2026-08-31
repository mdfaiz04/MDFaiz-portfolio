import { palette } from './palette'

/**
 * The app mark, drawn as boxes rather than type.
 *
 * Used by icon.tsx and apple-icon.tsx, both of which render through Satori,
 * where a glyph depends on a font being available and a rectangle does not.
 * At sixteen pixels an "F" made of three solid bars is also simply more
 * legible than an "F" made of letterforms.
 *
 * Proportions are expressed against a 32-unit grid and scaled, so one shape
 * definition serves every icon size.
 */

const GRID = 32

export function Mark({ size }: { size: number }) {
  const unit = size / GRID
  const stroke = 5 * unit
  const height = 22 * unit
  const arm = 13 * unit

  const ink = `linear-gradient(160deg, ${palette.accentBright} 0%, ${palette.accentGlow} 100%)`

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.ground,
        backgroundImage: `linear-gradient(140deg, ${palette.ground} 0%, ${palette.surface} 100%)`,
      }}
    >
      <div style={{ display: 'flex' }}>
        <div style={{ width: stroke, height, backgroundImage: ink }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: arm, height: stroke, backgroundImage: ink }} />
          <div style={{ width: arm, height: 5 * unit }} />
          <div
            style={{ width: arm * 0.7, height: stroke, backgroundImage: ink }}
          />
        </div>
      </div>
    </div>
  )
}
