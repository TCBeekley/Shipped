#!/usr/bin/env node
// Renders the home page to real HTML at build time and injects it into
// dist/index.html. The page has no interactivity, so this is the whole
// runtime: nothing hydrates it, and the only script served is the proxied
// analytics tracker, which touches none of this markup.
//
// Runs after `vite build` (see the build script in package.json).

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const root = resolve(import.meta.dirname, '..')
const indexFile = resolve(root, 'dist', 'index.html')

// Render through Vite's SSR loader rather than a second build: one module
// graph, no extra output directory.
const vite = await createServer({
  root,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'warn',
})

let markup
try {
  const { default: App } = await vite.ssrLoadModule('/src/App.tsx')
  // Static markup, not renderToString: no hydration means no need for the
  // data-reactroot bookkeeping that only a client runtime would consume.
  markup = renderToStaticMarkup(createElement(App))
} finally {
  await vite.close()
}

// Home-page images live in public/ and are referenced by URL, so nothing here
// should point back into src/. If that ever changes, the markup would 404 in
// production — fail the build rather than ship it.
const leaked = markup.match(/\/src\/[^"'\s)]+/g)
if (leaked) {
  throw new Error(
    `prerender: markup references source paths that will not exist in the ` +
      `build: ${[...new Set(leaked)].join(', ')}`,
  )
}

const html = readFileSync(indexFile, 'utf8')
const placeholder = '<div id="root"></div>'
if (!html.includes(placeholder)) {
  throw new Error('prerender: could not find the root placeholder')
}

writeFileSync(
  indexFile,
  html.replace(placeholder, `<div id="root">${markup}</div>`),
)
console.log(`Prerendered the home page (${markup.length} chars of markup).`)
