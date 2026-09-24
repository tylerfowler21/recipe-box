import type { MetadataRoute } from 'next'

/**
 * Lets the app be installed to a home screen and open without browser chrome.
 * The icons are the generated ones from icon.tsx and apple-icon.tsx.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Recipe Box',
    short_name: 'Recipes',
    description: 'The family recipe collection.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f1e7',
    theme_color: '#f6f1e7',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
