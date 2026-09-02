import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Silently updates the cached app shell in the background and swaps
      // it in on the next load — no "a new version is available, reload?"
      // prompt to build UI for. Fine for this app: nothing here needs the
      // stronger guarantee of forcing everyone onto one exact build at once.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Evertill',
        short_name: 'Evertill',
        description:
          "Evertill is two apps under one login: Tasks + Notes for everyday work, and a Leads, Pipeline, and Deals CRM for the relationships and transactions you're closing.",
        // Matches --bg-app (src/index.css) — the color the OS chrome
        // (status bar, task switcher, splash screen background) shows
        // around the app, so it reads as a continuation of the UI itself
        // rather than a mismatched frame while the app boots.
        theme_color: '#020817',
        background_color: '#020817',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // A separate asset, not "any maskable" on the same icon — a
          // maskable icon needs real padding for the OS's own circular/
          // rounded-square crop, which would look wrong as a plain
          // (non-cropped) "any" icon if the two purposes shared one image.
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
