// Sync every page-derived indicator count across the docs from a single source
// of truth: the deep-dive pages themselves (Indicators/Indicator-*.md).
//
// The cross-repo `wickra-bot` sync only rewrites the headline indicator count
// (e.g. "485 indicators") in four spots — it does NOT touch the per-family
// breakdown, the deep-dive-page total, the alphabetical index, or the sidebar.
// Those used to be hand-maintained and drifted (Price Statistics showed 44 in
// one file and 24 in another). This script makes them all derive from the
// pages on disk, so they can never disagree again.
//
// What it owns (regenerated from Indicators/*.md):
//   1. overview.md            — "<N> deep-dive pages" total
//   2. overview.md            — the "### <Family> (<count>)" alphabetical index
//                               (every family, every page, sorted, counted)
//   3. Indicators-Overview.md — the "Count" column of the 24-family summary table
//   4. .vitepress/sidebar.ts  — the items of each indicator-family group
//
// What it does NOT own (bespoke prose, left to humans):
//   - the headline "<N> indicators" count (cross-repo bot territory)
//   - the per-indicator detail tables in Indicators-Overview.md (hand-tuned
//     one-liners) and the warmup tables in Warmup-Periods.md
//
// Usage:
//   node scripts/sync-doc-counts.mjs           # write the synced counts in place
//   node scripts/sync-doc-counts.mjs --check    # CI gate: exit 1 if anything drifts

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const check = process.argv.includes('--check')

// Canonical family order — matches the numbered summary table in
// Indicators-Overview.md and the section order of the overview.md index.
const FAMILY_ORDER = [
  'Moving Averages',
  'Momentum Oscillators',
  'Trend & Directional',
  'Price Oscillators',
  'Volatility & Bands',
  'Bands & Channels',
  'Trailing Stops',
  'Volume',
  'Price Statistics',
  'Ehlers / Cycle (DSP)',
  'Pivots & S/R',
  'DeMark',
  'Ichimoku & Charts',
  'Candlestick Patterns',
  'Market Profile',
  'Risk / Performance',
  'Microstructure',
  'Derivatives',
  'Alt-Chart Bars',
  'Market Breadth',
  'Seasonality & Session',
  'Chart Patterns',
  'Harmonic Patterns',
  'Fibonacci',
]

// Family-label aliases found in some pages → canonical label.
const ALIASES = new Map([['Ehlers / Cycle', 'Ehlers / Cycle (DSP)']])

const CANON = new Set(FAMILY_ORDER)

function fail(msg) {
  console.error(`sync-doc-counts: ${msg}`)
  process.exit(1)
}

// ── 1. Build the source of truth: family → sorted indicator names ────────────
function scanPages() {
  const dir = path.join(repoRoot, 'Indicators')
  const files = fs.readdirSync(dir).filter((f) => /^Indicator-.+\.md$/.test(f))
  const byFamily = new Map(FAMILY_ORDER.map((f) => [f, []]))
  for (const file of files) {
    const name = file.replace(/^Indicator-/, '').replace(/\.md$/, '')
    const txt = fs.readFileSync(path.join(dir, file), 'utf8')
    const m = txt.match(/^\|\s*Family\s*\|\s*(.+?)\s*\|/m)
    if (!m) fail(`${file} has no "| Family | ... |" quick-reference row`)
    let fam = m[1].trim()
    fam = ALIASES.get(fam) ?? fam
    if (!CANON.has(fam)) fail(`${file} declares unknown family "${fam}"`)
    byFamily.get(fam).push(name)
  }
  for (const list of byFamily.values()) {
    list.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  }
  const total = files.length
  return { byFamily, total }
}

// ── tiny apply/check helper ──────────────────────────────────────────────────
const drift = []
function reconcile(relPath, current, next) {
  if (current === next) return
  drift.push(relPath)
  if (!check) fs.writeFileSync(path.join(repoRoot, relPath), next)
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ── 2. overview.md: deep-dive total + alphabetical index ─────────────────────
function syncOverview({ byFamily, total }) {
  const rel = 'overview.md'
  let txt = fs.readFileSync(path.join(repoRoot, rel), 'utf8')

  // (a) "<N> deep-dive pages"
  txt = txt.replace(/\b\d+ deep-dive pages\b/, `${total} deep-dive pages`)

  // (b) the index region: from the first "### " after the intro to "## See also"
  const introAt = txt.indexOf('deep-dive pages.')
  const regionStart = txt.indexOf('\n### ', introAt) + 1
  const regionEnd = txt.indexOf('\n## See also')
  if (regionStart === 0 || regionEnd === -1) fail('overview.md index markers not found')

  // Two links per line, each non-final line keeping the ` ·` separator at its
  // end — matches the hand-wrapped alphabetical index the page shipped with.
  const wrap2 = (links) => {
    const out = []
    for (let i = 0; i < links.length; i += 2) {
      const pair = links.slice(i, i + 2).join(' · ')
      out.push(i + 2 < links.length ? `${pair} ·` : pair)
    }
    return out.join('\n')
  }
  const blocks = FAMILY_ORDER.map((fam) => {
    const names = byFamily.get(fam)
    const links = names.map((n) => `[${n}](/Indicators/Indicator-${n})`)
    return `### ${fam} (${names.length})\n\n${wrap2(links)}`
  }).join('\n\n')

  const next = txt.slice(0, regionStart) + blocks + '\n' + txt.slice(regionEnd)
  reconcile(rel, fs.readFileSync(path.join(repoRoot, rel), 'utf8'), next)
}

// ── 3. Indicators-Overview.md: summary-table count column ────────────────────
function syncSummaryTable({ byFamily }) {
  const rel = 'Indicators-Overview.md'
  const current = fs.readFileSync(path.join(repoRoot, rel), 'utf8')
  let txt = current
  for (const fam of FAMILY_ORDER) {
    const count = byFamily.get(fam).length
    // | # | [Family](#anchor) | COUNT | What it answers |
    const re = new RegExp(
      `(\\|\\s*\\d+\\s*\\|\\s*\\[${escapeRe(fam)}\\]\\([^)]*\\)\\s*\\|\\s*)\\d+(\\s*\\|)`,
    )
    if (!re.test(txt)) fail(`summary-table row for "${fam}" not found in ${rel}`)
    txt = txt.replace(re, `$1${count}$2`)
  }
  reconcile(rel, current, txt)
}

// ── 4. sidebar.ts: items of each indicator-family group ──────────────────────
const SIDEBAR_HEADER =
  '// AUTO-GENERATED. Indicator family groups (items) are synced from\n' +
  '// Indicators/*.md by scripts/sync-doc-counts.mjs. Non-indicator groups\n' +
  '// (Getting started / Reference / Guides) were seeded by migrate-wiki.mjs.\n'

function syncSidebar({ byFamily }) {
  const rel = '.vitepress/sidebar.ts'
  const current = fs.readFileSync(path.join(repoRoot, rel), 'utf8')
  const m = current.match(/(\[[\s\S]*\])\s*$/)
  if (!m) fail('sidebar.ts: could not locate the exported array')
  const data = JSON.parse(m[1])
  for (const group of data) {
    if (!CANON.has(group.text)) continue
    group.items = byFamily.get(group.text).map((n) => ({
      text: n,
      link: `/Indicators/Indicator-${n}`,
    }))
  }
  const next = `${SIDEBAR_HEADER}export const sidebar = ${JSON.stringify(data, null, 2)}\n`
  reconcile(rel, current, next)
}

// ── run ──────────────────────────────────────────────────────────────────────
const truth = scanPages()
syncOverview(truth)
syncSummaryTable(truth)
syncSidebar(truth)

if (check) {
  if (drift.length) {
    fail(
      `out of sync — run \`node scripts/sync-doc-counts.mjs\`:\n  ${drift.join('\n  ')}`,
    )
  }
  console.log(`sync-doc-counts: OK — ${truth.total} deep-dive pages, all counts consistent`)
} else {
  console.log(
    drift.length
      ? `sync-doc-counts: updated ${drift.join(', ')} (${truth.total} pages)`
      : `sync-doc-counts: already in sync (${truth.total} pages)`,
  )
}
