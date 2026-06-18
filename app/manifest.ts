import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SimpleRoster',
    short_name: 'Roster',
    description: 'Dienstplan & Zeiterfassung',
    start_url: '/login',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4f46e5',
    icons: [
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { src: '/logo-s.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
