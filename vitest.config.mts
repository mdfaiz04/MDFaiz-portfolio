import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    // The default `forks` pool fails to hand off workers on this Windows
    // setup ("Timeout waiting for worker to respond"). Threads are reliable
    // here and faster for a suite of pure functions.
    pool: 'threads',
  },
})
