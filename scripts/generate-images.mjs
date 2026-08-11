#!/usr/bin/env node
// Regenerates committed image assets. Run after changing the source artwork
// or the brand tokens in src/index.css:
//
//   node scripts/generate-images.mjs
//
// Outputs are committed so the build stays dependency-free; sharp is only
// needed to regenerate them.

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const out = (path) => resolve(root, path)

/** The SPT-50 icon renders in a 140px box; serve 1x/2x/3x, WebP + PNG. */
async function appIcon() {
  const source = out('src/assets/spt50-icon-source.png')
  const widths = [140, 280, 420]

  for (const width of widths) {
    const resized = sharp(source).resize(width, width, { fit: 'cover' })
    const base = out(`src/assets/spt50-icon-${width}`)
    await mkdir(dirname(base), { recursive: true })
    await resized.clone().webp({ quality: 82 }).toFile(`${base}.webp`)
    await resized.clone().png({ compressionLevel: 9 }).toFile(`${base}.png`)
  }
}

/**
 * 1200x630 link-preview card, built from the same tokens as the site so the
 * unfurl matches the page: wordmark on --bg, --accent for the colon, mono
 * subtitle in --text-faint.
 */
async function ogCard() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#fafafa"/>
  <rect x="0" y="0" width="1200" height="8" fill="#0d9488"/>
  <text x="90" y="300" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="96" font-weight="700" letter-spacing="-2" fill="#18181b">shipped<tspan fill="#0d9488">:</tspan></text>
  <text x="90" y="374" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="40" font-weight="400" fill="#3f3f46">apps people use, systems that stay up.</text>
  <text x="90" y="470" font-family="Menlo, DejaVu Sans Mono, monospace"
        font-size="26" letter-spacing="3" fill="#6e6e77">shipped.beekley.dev</text>
  <text x="90" y="520" font-family="Menlo, DejaVu Sans Mono, monospace"
        font-size="24" letter-spacing="2" fill="#6e6e77">web · iOS · infrastructure</text>
</svg>`

  await writeFile(out('src/assets/og-card.svg'), `${svg}\n`)
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(out('public/og-card.png'))
}

await appIcon()
await ogCard()
console.log('Regenerated app icon variants and the og card.')
