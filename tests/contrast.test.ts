import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// axe cannot check colour contrast under jsdom (no layout, no canvas), so the
// token palette is verified directly against the WCAG formula instead. If a
// token is retuned and drops below its threshold, this fails.

// jsdom rewrites import.meta.url to an http URL, so resolve from cwd.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

function token(name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{3,6})`, 'i'))
  if (!match) throw new Error(`token ${name} not found in src/index.css`)
  return match[1]
}

function relativeLuminance(hex: string): number {
  const normalized =
    hex.length === 4
      ? hex
          .slice(1)
          .split('')
          .map((c) => c + c)
          .join('')
      : hex.slice(1)

  const [r, g, b] = (normalized.match(/../g) ?? []).map((pair) => {
    const channel = parseInt(pair, 16) / 255
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  )
  return (lighter + 0.05) / (darker + 0.05)
}

describe('colour token contrast', () => {
  const backgrounds = [
    ['--bg', token('--bg')],
    ['--surface', token('--surface')],
  ] as const

  // WCAG AA: 4.5:1 for normal text.
  const normalText = [
    '--text',
    '--text-body',
    '--text-secondary',
    '--text-tertiary',
    '--text-faint',
    '--accent-text',
    '--accent-hover',
  ]

  for (const name of normalText) {
    for (const [bgName, bg] of backgrounds) {
      it(`${name} on ${bgName} meets 4.5:1`, () => {
        expect(contrastRatio(token(name), bg)).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  // --accent is decoration (dots, borders, focus ring) plus the h1 highlight,
  // which is large text — both need 3:1, not 4.5:1.
  for (const [bgName, bg] of backgrounds) {
    it(`--accent on ${bgName} meets 3:1 for large text and UI`, () => {
      expect(contrastRatio(token('--accent'), bg)).toBeGreaterThanOrEqual(3)
    })
  }

  it('keeps the text ramp ordered from strongest to faintest', () => {
    const ramp = [
      '--text',
      '--text-body',
      '--text-secondary',
      '--text-tertiary',
      '--text-faint',
    ].map((name) => contrastRatio(token(name), token('--bg')))

    expect(ramp).toEqual([...ramp].sort((a, b) => b - a))
  })
})
