/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// The app is served from https://<user>.github.io/reperes/, so assets need the
// repository name as a base path. A local dev server uses '/' instead.
const base = process.env.GITHUB_ACTIONS ? '/reperes/' : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Repères',
        short_name: 'Repères',
        description: 'Réviser sa culture générale par répétition espacée.',
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#0b0f14',
        theme_color: '#0b0f14',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
