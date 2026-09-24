import { ImageResponse } from 'next/og'

/**
 * The browser-tab icon.
 *
 * The same bowl as the home-screen icon, minus the steam: at 32px the steam
 * strokes collapse into a smudge above the rim and read as noise.
 */
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

const GREEN = '#2C5F4A'
const CREAM = '#F6F1E7'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: GREEN,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 180 180" fill="none">
          <rect x="24" y="52" width="132" height="18" rx="9" fill={CREAM} />
          <path
            d="M32 70 C 32 106, 58 126, 90 126 C 122 126, 148 106, 148 70 Z"
            fill={CREAM}
          />
        </svg>
      </div>
    ),
    { ...size },
  )
}
