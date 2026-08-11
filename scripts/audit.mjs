#!/usr/bin/env node
// Fails on high/critical npm advisories, with a narrow allowlist for ones we
// genuinely cannot fix (a vulnerable package bundled inside a dependency's
// published tarball, where no lockfile change reaches it).
//
// Usage: node scripts/audit.mjs [directory]
//
// An allowlist entry suppresses exactly one advisory id in one directory.
// Anything else at high or above still fails, and an entry that no longer
// matches is reported so it gets deleted once upstream ships the fix.

import { execFileSync } from 'node:child_process'

const ALLOWLIST = [
  {
    id: 'GHSA-rgw5-rvv9-x895',
    package: 'brace-expansion',
    scope: 'infra',
    reason:
      'Bundled inside the aws-cdk-lib tarball, so no lockfile change can ' +
      'update it. Synth-time tooling only (DoS), never runs in production. ' +
      'Remove once aws-cdk-lib bundles brace-expansion >= 5.0.9.',
  },
]

const BLOCKING = new Set(['high', 'critical'])
const dir = process.argv[2] ?? '.'

function audit() {
  try {
    return execFileSync('npm', ['audit', '--json'], {
      cwd: dir,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    })
    // npm exits non-zero when it finds anything; the JSON is still on stdout.
  } catch (error) {
    if (error.stdout) return error.stdout
    throw error
  }
}

const report = JSON.parse(audit())
const seen = new Set()
const blocking = []

for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  if (!BLOCKING.has(vuln.severity)) continue

  for (const via of vuln.via) {
    if (typeof via === 'string') continue // transitive pointer, not an advisory
    const id = via.url?.split('/').pop()
    const allowed = ALLOWLIST.find(
      (entry) => entry.id === id && entry.scope === dir,
    )
    if (allowed) {
      seen.add(allowed.id)
      continue
    }
    blocking.push({
      id,
      package: via.name,
      severity: via.severity,
      title: via.title,
    })
  }
}

for (const entry of ALLOWLIST.filter((entry) => entry.scope === dir)) {
  if (!seen.has(entry.id)) {
    console.log(
      `note: allowlisted advisory ${entry.id} (${entry.package}) no longer ` +
        `appears in ${dir} — delete it from scripts/audit.mjs.`,
    )
  }
}

if (blocking.length === 0) {
  const suppressed = seen.size ? ` (${seen.size} allowlisted)` : ''
  console.log(`No blocking advisories in ${dir}${suppressed}.`)
  process.exit(0)
}

console.error(`Blocking advisories in ${dir}:`)
for (const item of blocking) {
  console.error(
    `  [${item.severity}] ${item.package}: ${item.title} (${item.id})`,
  )
}
process.exit(1)
