/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import { createLogger, defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/*
 * The Plausible tracker is a classic script served from /js/ on this domain,
 * which CloudFront proxies upstream to plausible.io. Vite's HTML plugin warns
 * once per page that it "can't be bundled without type=\"module\"", because it
 * only stays quiet for a URL that is external, a data: URI, or a real file in
 * public/ -- and this is deliberately none of the three.
 *
 * Every way of satisfying the check is worse than the warning. type="module"
 * would change the script's semantics for a file that is not an ES module; an
 * absolute https:// URL would hardcode the production host into every page and
 * break local preview; and a copy under public/ would put a stale vendored
 * tracker in the bucket that CloudFront never serves, since the /js/ behaviour
 * routes to plausible.io before S3 is consulted.
 *
 * So the warning is filtered rather than satisfied. The pattern is deliberately
 * narrow -- this script path, this message -- so any other unbundleable script
 * still warns. A test covers both halves of that.
 */
export const ANALYTICS_SCRIPT_WARNING =
  /^<script src="\/js\/script[\w.-]*\.js"> in "[^"]+" can't be bundled without type="module" attribute$/

const logger = createLogger()
const parentWarn = logger.warn.bind(logger)
logger.warn = (message, options) => {
  if (ANALYTICS_SCRIPT_WARNING.test(message)) return
  parentWarn(message, options)
}

// https://vite.dev/config/
export default defineConfig({
  customLogger: logger,
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
        openvpnFleet: resolve(import.meta.dirname, 'openvpn-fleet.html'),
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
