/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Never inline assets as data URIs. Vite's 4 KB default would fold the
    // 1x/2x icon variants into the JS bundle, so every visitor downloads
    // every variant regardless of their DPR — exactly what the srcset exists
    // to avoid — and base64 inflates them ~33% on the way in. Emitting real
    // files also keeps them content-hashed and independently cacheable.
    assetsInlineLimit: 0,
    rollupOptions: {
      // Multi-page: the home page is the React app; case studies are plain
      // HTML entries with no application JavaScript. Each is a real document,
      // so crawlers and link unfurlers see content without executing anything.
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        transferTracker: resolve(import.meta.dirname, 'transfer-tracker.html'),
        nchsaaSeeding: resolve(import.meta.dirname, 'nchsaa-seeding.html'),
        cpapTracker: resolve(import.meta.dirname, 'cpap-tracker.html'),
        spt50: resolve(import.meta.dirname, 'spt-50.html'),
        // Served by CloudFront for any unmatched path, with a real 404 status.
        notFound: resolve(import.meta.dirname, '404.html'),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/vite-env.d.ts'],
      // Fail the run below 80% line coverage (enforced in CI).
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
