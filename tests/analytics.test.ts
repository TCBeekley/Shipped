import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * The Plausible tracker is proxied through this domain, which is what keeps
 * the CSP at script-src 'self' and leaves no third-party host for a content
 * blocker to match. Both properties are easy to lose in a copy-paste from
 * Plausible's own docs, which hand you an absolute plausible.io URL, so they
 * are asserted rather than assumed.
 */

const viteConfig = readFileSync(
  resolve(process.cwd(), 'vite.config.ts'),
  'utf8',
)

const pages = [
  ...viteConfig.matchAll(/resolve\(import\.meta\.dirname, '([^']+\.html)'\)/g),
].map((m) => m[1])

const read = (page: string) =>
  readFileSync(resolve(process.cwd(), page), 'utf8')

describe('analytics', () => {
  it('covers every page the build emits', () => {
    expect(pages.length).toBe(6)

    for (const page of pages) {
      expect(read(page), `${page} has no tracker`).toMatch(
        /<script\b[^>]*\bsrc="\/js\/script[^"]*\.js"/s,
      )
    }
  })

  it('loads the tracker from this origin, not plausible.io', () => {
    // An absolute URL here would need the CSP widened to a third party and
    // would put the script back on every blocklist the proxy exists to avoid.
    for (const page of pages) {
      const html = read(page)
      expect(html).not.toMatch(/src="https?:\/\/[^"]*plausible/i)

      const tag = html.match(/<script\b[^>]*>/s)?.[0] ?? ''
      expect(
        tag,
        `${page} should load the tracker from a root-relative path`,
      ).toMatch(/src="\/js\//)
    }
  })

  it('reports under the site domain and defers', () => {
    for (const page of pages) {
      const tag = read(page).match(/<script\b[^>]*>/s)?.[0] ?? ''
      // Wrong data-domain sends events to a property that is not this site.
      expect(tag, page).toMatch(/data-domain="shipped\.beekley\.dev"/)
      expect(tag, page).toMatch(/\bdefer\b/)
    }
  })

  it('ships no inline script, which the CSP has no unsafe-inline for', () => {
    for (const page of pages) {
      const inline = [...read(page).matchAll(/<script\b([^>]*)>/gs)].filter(
        (m) => !/\bsrc=/.test(m[1]),
      )
      expect(inline, `${page} has an inline script`).toHaveLength(0)
    }
  })
})
