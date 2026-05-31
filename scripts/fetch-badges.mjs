/*
 * Snapshot the repo-status badge SVGs into public/badges/ and write a manifest
 * (.vitepress/theme/badges.json) with each badge's intrinsic width/height.
 *
 * Why: the footer badge row used to hot-link shields.io / GitHub / codecov at
 * page load. Those are separate cross-origin requests that resolve at different
 * times, so the badges popped in one by one and reflowed the centred row. Served
 * from our own origin (Cloudflare) with known dimensions, the row paints with
 * the page and never shifts.
 *
 * This script is run by .github/workflows/refresh-badges.yml on a schedule
 * (commit-if-changed). The site BUILD never calls it, so an upstream badge-host
 * outage can never break a deploy — the last committed snapshot is always used.
 *
 * Fault-tolerant: if a single badge can't be fetched, the previous committed
 * snapshot for it is kept rather than dropping it from the row.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

// Source of truth for the footer badge row. Mirrors the GitHub wickra README.
const badges = [
  { alt: 'CI', slug: 'ci', src: 'https://github.com/wickra-lib/wickra/actions/workflows/ci.yml/badge.svg', href: 'https://github.com/wickra-lib/wickra/actions/workflows/ci.yml' },
  { alt: 'CodeQL', slug: 'codeql', src: 'https://github.com/wickra-lib/wickra/actions/workflows/codeql.yml/badge.svg', href: 'https://github.com/wickra-lib/wickra/actions/workflows/codeql.yml' },
  { alt: 'codecov', slug: 'codecov', src: 'https://codecov.io/gh/wickra-lib/wickra/branch/main/graph/badge.svg', href: 'https://codecov.io/gh/wickra-lib/wickra' },
  { alt: 'GitHub release', slug: 'release', src: 'https://img.shields.io/github/v/release/wickra-lib/wickra?logo=github&color=green', href: 'https://github.com/wickra-lib/wickra/releases/latest' },
  { alt: 'crates.io', slug: 'crates', src: 'https://img.shields.io/crates/v/wickra.svg?logo=rust&color=orange', href: 'https://crates.io/crates/wickra' },
  { alt: 'PyPI', slug: 'pypi', src: 'https://img.shields.io/pypi/v/wickra.svg?logo=pypi&color=blue', href: 'https://pypi.org/project/wickra/' },
  { alt: 'npm', slug: 'npm', src: 'https://img.shields.io/npm/v/wickra.svg?logo=npm&color=red', href: 'https://www.npmjs.com/package/wickra' },
  { alt: 'License: PolyForm-NC', slug: 'license', src: 'https://img.shields.io/badge/license-PolyForm--NC--1.0.0-purple', href: 'https://github.com/wickra-lib/wickra/blob/main/LICENSE' },
  { alt: 'OpenSSF Scorecard', slug: 'scorecard', src: 'https://api.securityscorecards.dev/projects/github.com/wickra-lib/wickra/badge', href: 'https://scorecard.dev/viewer/?uri=github.com/wickra-lib/wickra' },
  { alt: 'Build provenance', slug: 'provenance', src: 'https://img.shields.io/badge/provenance-attested-brightgreen?logo=github', href: 'https://github.com/wickra-lib/wickra/attestations' },
]

const outDir = resolve(root, 'public/badges')
mkdirSync(outDir, { recursive: true })
const manifestPath = resolve(root, '.vitepress/theme/badges.json')
const prev = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf-8')) : []
const prevByAlt = new Map(prev.map((b) => [b.alt, b]))

function dimsOf(svg) {
  const w = svg.match(/<svg[^>]*?\bwidth="([\d.]+)"/)
  const h = svg.match(/<svg[^>]*?\bheight="([\d.]+)"/)
  return {
    width: w ? Math.round(parseFloat(w[1])) : null,
    height: h ? Math.round(parseFloat(h[1])) : null,
  }
}

const manifest = []
let failures = 0
for (const b of badges) {
  const file = `/badges/${b.slug}.svg`
  try {
    const res = await fetch(b.src, { redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const svg = await res.text()
    if (!svg.includes('<svg')) throw new Error('response is not an SVG')
    writeFileSync(resolve(outDir, `${b.slug}.svg`), svg)
    const { width, height } = dimsOf(svg)
    manifest.push({ alt: b.alt, href: b.href, file, width, height })
    console.log(`fetch-badges: ${b.slug} ${width}x${height}`)
  } catch (err) {
    failures++
    const old = prevByAlt.get(b.alt)
    if (old) {
      manifest.push(old)
      console.warn(`fetch-badges: ${b.slug} failed (${err.message}); kept previous snapshot`)
    } else {
      console.warn(`fetch-badges: ${b.slug} failed (${err.message}); no previous snapshot, skipped`)
    }
  }
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`fetch-badges: wrote ${manifest.length} badge(s), ${failures} failure(s)`)
