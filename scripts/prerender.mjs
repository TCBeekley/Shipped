#!/usr/bin/env node
// Renders the home page to real HTML at build time and injects it into
// dist/index.html, so crawlers and unfurlers that do not run JavaScript see
// the content. The client bundle still hydrates the same markup.
//
// Runs after `vite build` (see the build script in package.json).

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'

const root = resolve(import.meta.dirname, '..')
const dist = (file) => resolve(root, 'dist', file)

// Render through Vite's SSR loader rather than a second build: the page is
// static, so this is one module graph and no extra output directory.
const vite = await createServer({
  root,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'warn',
})

let markup
try {
  const { default: App } = await vite.ssrLoadModule('/src/App.tsx')
  markup = renderToString(createElement(App))
} finally {
  await vite.close()
}

// SSR resolves assets to their source paths (/src/assets/…). The client build
// emitted hashed filenames, so rewrite them via the manifest — otherwise the
// prerendered markup would 404 on every image until hydration replaced it.
const manifest = JSON.parse(readFileSync(dist('.vite/manifest.json'), 'utf8'))
const assetMap = new Map(
  Object.entries(manifest)
    .filter(([source]) => source.startsWith('src/assets/'))
    .map(([source, entry]) => [`/${source}`, `/${entry.file}`]),
)

let unresolved = 0
markup = markup.replace(/\/src\/assets\/[^"'\s)]+/g, (match) => {
  const mapped = assetMap.get(match)
  if (!mapped) {
    unresolved += 1
    console.error(`prerender: no manifest entry for ${match}`)
  }
  return mapped ?? match
})

if (unresolved > 0) {
  throw new Error(
    `prerender: ${unresolved} asset path(s) had no hashed equivalent; ` +
      'the prerendered markup would 404 before hydration.',
  )
}

const file = dist('index.html')
const html = readFileSync(file, 'utf8')
const placeholder = '<div id="root"></div>'
if (!html.includes(placeholder)) {
  throw new Error('prerender: could not find the root placeholder')
}

writeFileSync(file, html.replace(placeholder, `<div id="root">${markup}</div>`))
console.log(`Prerendered the home page (${markup.length} chars of markup).`)
