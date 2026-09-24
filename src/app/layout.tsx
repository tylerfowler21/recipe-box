import type { Metadata, Viewport } from 'next'
import { Fraunces, Work_Sans } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['SOFT', 'WONK'],
})
// Work Sans over Inter: the box is warm and paper-like, and Inter's neutrality
// reads as software. Work Sans has a little more humanity at body sizes.
const workSans = Work_Sans({ subsets: ['latin'], variable: '--font-work-sans' })

export const metadata: Metadata = {
  title: 'Recipe Box',
  description: 'The family recipe collection — searchable, organised, and on every phone.',
  // Saved to a home screen, it opens without Safari's chrome and keeps the
  // status bar on the app's own paper colour rather than white.
  appleWebApp: {
    capable: true,
    title: 'Recipes',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f1e7' },
    { media: '(prefers-color-scheme: dark)', color: '#16140f' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${workSans.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
