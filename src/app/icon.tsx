import { ImageResponse } from 'next/og'

import { Mark } from '@/lib/brand/Mark'

/** Browser-tab icon. Generated at build time into a static PNG. */
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<Mark size={size.width} />, size)
}
