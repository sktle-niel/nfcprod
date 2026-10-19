import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
    testTimeout: 15_000,
  },
})
