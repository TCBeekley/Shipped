#!/usr/bin/env node
// The CloudFront response headers policy (infra/lib/hosting-stack.ts) serves a
// Content-Security-Policy of:
//
//   default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self';
//   object-src 'none'; base-uri 'self'; form-action 'none';
//   frame-ancestors 'none'
//
// That policy is a promise about what the build emits, and it is enforced at
// the edge — in production only. A violation therefore cannot surface in dev,
// in tests, or in `vite preview`: the first symptom would be a blocked asset
// on the live site. So the build asserts the promise instead of trusting it.
//
// Runs after prerender (see the build script in package.json).

import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve(import.meta.dirname, '..', 'dist')
const pages = readdirSync(dist).filter((f) => f.endsWith('.html'))

if (pages.length === 0) {
  throw new Error('check-csp: no HTML in dist/ — did the build run?')
}

// The rel values that make a <link> actually fetch something. Anything else
// (canonical, alternate, author, me) is metadata and loads nothing.
const FETCHING_REL =
  /\brel="[^"]*\b(?:stylesheet|preload|prefetch|preconnect|modulepreload|icon|manifest)\b/i

// Each rule names the directive it would violate, so a failure points at the
// line of policy to change if the violation turns out to be intentional.
const rules = [
  {
    directive: "script-src 'none'",
    pattern: /<script\b/gi,
    hint: 'the site ships no JavaScript; a script tag would be blocked',
  },
  {
    directive: "style-src 'self'",
    pattern: /<style\b|\sstyle="/gi,
    hint: "inline style needs 'unsafe-inline', a hash, or a nonce",
  },
  {
    directive: "img-src 'self'",
    pattern: /(?:src|href)="data:|url\(\s*['"]?data:/gi,
    hint: 'a data: URI needs data: added back to img-src',
  },
  {
    // Only subresource loads are governed, so this rule is deliberately
    // narrow on two counts. An <a href> to another origin is navigation,
    // which no directive here restricts — the case studies link out to the
    // App Store and GitHub and must keep doing so. And a <link> only fetches
    // for certain rel values: rel="canonical" is metadata a crawler reads,
    // not a request the browser makes.
    directive: "default-src 'self'",
    find: (html) =>
      [
        ...html.matchAll(/\bsrc="(https?:\/\/[^"]*)"/gi),
        ...[...html.matchAll(/<link\b[^>]*>/gis)]
          .filter((tag) => FETCHING_REL.test(tag[0]))
          .flatMap((tag) => [
            ...tag[0].matchAll(/\bhref="(https?:\/\/[^"]*)"/gi),
          ]),
      ].map((m) => m[1]),
    hint: 'cross-origin subresources need that origin allowed explicitly',
  },
  {
    directive: "form-action 'none'",
    pattern: /<form\b/gi,
    hint: 'a form cannot submit anywhere under form-action none',
  },
  {
    directive: "object-src 'none'",
    pattern: /<(?:object|embed)\b/gi,
    hint: 'plugin content is blocked outright',
  },
]

const violations = []
for (const page of pages) {
  const html = readFileSync(resolve(dist, page), 'utf8')
  for (const { directive, pattern, find, hint } of rules) {
    const hits = find ? find(html) : html.match(pattern)
    if (hits && hits.length > 0) {
      violations.push(
        `  ${page}: ${hits.length}x ${JSON.stringify(hits[0])} ` +
          `violates ${directive} — ${hint}`,
      )
    }
  }
}

if (violations.length > 0) {
  throw new Error(
    `check-csp: the build emits markup the production CSP would block.\n` +
      `Either fix the markup or widen the policy in ` +
      `infra/lib/hosting-stack.ts (and its test).\n\n` +
      violations.join('\n'),
  )
}

console.log(`CSP conformance: ${pages.length} pages clean.`)
