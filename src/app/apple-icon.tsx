import { ImageResponse } from 'next/og'

import { Mark } from '@/lib/brand/Mark'

/** Home-screen icon on iOS. Same mark, same source, larger grid. */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(<Mark size={size.width} />, size)
}
