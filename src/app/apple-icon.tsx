import { ImageResponse } from 'next/og'

/**
 * The home-screen icon.
 *
 * A bowl, matching the wordmark, drawn full-bleed on the app's green: iOS
 * applies its own rounded mask, so rounding the corners here would show as a
 * dark ring around the icon. Kept to two flat colours and one solid silhouette
 * — at 60pt on a home screen, anything finer turns to mud.
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const GREEN = '#2C5F4A'
const CREAM = '#F6F1E7'

export default function AppleIcon() {
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
        <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
          {/* steam — the outer two sit back so the middle one leads */}
          <path
            d="M70 74 C 62 62, 78 54, 70 40"
            stroke={CREAM}
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M90 76 C 82 62, 98 52, 90 36"
            stroke={CREAM}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M110 74 C 102 62, 118 54, 110 40"
            stroke={CREAM}
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.7"
          />
          {/* rim */}
          <rect x="26" y="80" width="128" height="14" rx="7" fill={CREAM} />
          {/* bowl */}
          <path
            d="M36 94 C 36 128, 60 146, 90 146 C 120 146, 144 128, 144 94 Z"
            fill={CREAM}
          />
        </svg>
      </div>
    ),
    { ...size },
  )
}
