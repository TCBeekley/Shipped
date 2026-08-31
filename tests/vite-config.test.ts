import { describe, expect, it } from 'vitest'
import { ANALYTICS_SCRIPT_WARNING } from '../vite.config'

/*
 * The build filters one Vite warning: the tracker is a classic script served
 * from a path CloudFront proxies, which Vite cannot bundle and says so once per
 * page. Suppressing a log line is only safe while the pattern stays narrow, so
 * this pins both halves — what it must silence, and what it must not.
 */

const real = (page: string) =>
  `<script src="/js/script.outbound-links.js"> in "/${page}" can't be bundled without type="module" attribute`

describe('ANALYTICS_SCRIPT_WARNING', () => {
  it('matches the warning the tracker actually produces', () => {
    for (const page of [
      'index.html',
      'spt-50.html',
      'openvpn-fleet.html',
      '404.html',
    ]) {
      expect(ANALYTICS_SCRIPT_WARNING.test(real(page))).toBe(true)
    }
  })

  it('matches the other Plausible script builds', () => {
    // Switching variants (outbound-links, tagged-events, hash) must not
    // resurrect the warning.
    for (const file of [
      'script.js',
      'script.tagged-events.js',
      'script.hash.outbound-links.js',
    ]) {
      const message = `<script src="/js/${file}"> in "/index.html" can't be bundled without type="module" attribute`
      expect(ANALYTICS_SCRIPT_WARNING.test(message)).toBe(true)
    }
  })

  it('does not silence a warning about any other script', () => {
    // The whole risk of a log filter is that it grows teeth. A different
    // unbundleable script is a real problem and has to stay visible.
    const others = [
      `<script src="/assets/main.js"> in "/index.html" can't be bundled without type="module" attribute`,
      `<script src="/vendor/analytics.js"> in "/index.html" can't be bundled without type="module" attribute`,
      `<script src="https://cdn.example.com/js/script.js"> in "/index.html" can't be bundled without type="module" attribute`,
    ]
    for (const message of others) {
      expect(
        ANALYTICS_SCRIPT_WARNING.test(message),
        `should not have silenced: ${message}`,
      ).toBe(false)
    }
  })

  it('does not silence unrelated Vite warnings', () => {
    for (const message of [
      'Some chunks are larger than 500 kB after minification.',
      '/js/script.outbound-links.js referenced in /index.html did not resolve at build time',
    ]) {
      expect(ANALYTICS_SCRIPT_WARNING.test(message)).toBe(false)
    }
  })
})
