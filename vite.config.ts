import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// NFC cards keep their menu link for good. Without VITE_PUBLIC_ORIGIN, the link follows the address the dashboard is
// open on, so a production build says so. The build still succeeds.
const warnWithoutPublicOrigin: Plugin = {
  name: 'warn-without-public-origin',
  configResolved(config) {
    if (config.command !== 'build' || config.mode !== 'production') return
    if (String(config.env.VITE_PUBLIC_ORIGIN ?? '').trim() !== '') return
    config.logger.warn(
      'VITE_PUBLIC_ORIGIN is empty: menu links will use the address the dashboard is open on. Set it to the final domain before any NFC card is written.',
    )
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), warnWithoutPublicOrigin],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // jsdom suites are CPU-heavy. One worker per core starves each of them on a busy machine and
    // UI tests time out at random, which blocks the commit hook. Two workers run as fast and stay steady.
    maxWorkers: 2,
    // The longest dashboard walks (leave Design and come back, Back and Forward) took over 15 s with memory short (an
    // editor and a browser open on 8 GB), and timed out on main too. A test that truly hangs still fails, at 30 s.
    testTimeout: 30_000,
    // The tests assume the public map services, the public place lists and no order endpoint, whatever a developer's
    // .env.local or shell says. An empty value reads as "not set" (src/config/env.ts), so the defaults apply.
    env: { VITE_MAP_STYLE: '', VITE_GEOCODER_API: '', VITE_LOCATIONS_API: '', VITE_ORDERS_ENDPOINT: '', VITE_PUBLIC_ORIGIN: '', VITE_STORAGE_ORIGIN: 'https://images.example.com' },
  },
})
