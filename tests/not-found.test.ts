import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * The 404 page lists every page on the site by hand, which is only reasonable
 * while that list is short and cannot silently fall behind. This ties it to
 * the build's entry points: add a page to vite.config.ts without listing it
 * here and this fails.
 */

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8')

const notFound = read('404.html')
const viteConfig = read('vite.config.ts')

/** Entry HTML files the multi-page build emits, 404 itself excluded. */
const entries = [
  ...viteConfig.matchAll(/resolve\(import\.meta\.dirname, '([^']+\.html)'\)/g),
]
  .map((m) => m[1])
  .filter((f) => f !== '404.html')

describe('404.html', () => {
  it('is wired into the multi-page build', () => {
    expect(viteConfig).toContain("'404.html'")
  })

  it('links every page the build emits', () => {
    expect(entries.length).toBeGreaterThan(0)

    for (const entry of entries) {
      // index.html is reachable at / rather than by filename.
      const href = entry === 'index.html' ? '/' : `/${entry}`
      expect(notFound, `404.html does not link ${href}`).toContain(
        `href="${href}"`,
      )
    }
  })

  it('links nothing that the build does not emit', () => {
    const known = new Set(['/', ...entries.map((e) => `/${e}`)])
    const internal = [...notFound.matchAll(/href="(\/[^"#]*)"/g)]
      .map((m) => m[1])
      // Static assets are emitted by Vite, not listed as entry points.
      .filter((h) => !/\.(css|svg|png|webp|ico)$/.test(h))

    for (const href of internal) {
      expect(known.has(href), `${href} has no page behind it`).toBe(true)
    }
  })

  it('asks crawlers not to index it', () => {
    // Every URL that reaches this page is one worth forgetting.
    expect(notFound).toMatch(/<meta name="robots" content="[^"]*noindex/)
  })
})
