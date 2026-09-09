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
      // Fonts are not in the default precache list, and this app is meant to
      // work on a train. Only the latin subsets are built, so this is four
      // files, not thirty-eight.
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'] },
      manifest: {
        name: 'Repères',
        short_name: 'Repères',
        description: 'Réviser sa culture générale par répétition espacée.',
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        // A manifest carries one colour and cannot answer to
        // prefers-color-scheme, so it carries the default scheme: paper.
        background_color: '#fbf9f5',
        theme_color: '#fbf9f5',
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
