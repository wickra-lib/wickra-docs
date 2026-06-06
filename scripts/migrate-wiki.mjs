// Migrate the GitHub-Wiki markdown into this VitePress repo.
//
// - copies guide/reference pages to the docs root and the indicator catalogue
//   into Indicators/ (same filenames); Indicator-Chaining stays at the root
// - rewrites kingchenc/wickra -> wickra-lib/wickra (org migration)
// - rewrites the wiki's relative page links to the absolute paths VitePress
//   serves once the catalogue lives under Indicators/
// - bumps the published-version references 0.2.7 -> 0.3.1 on the overview page
// - turns Home.md into overview.md (index.md is a hand-written hero landing)
// - drops _Footer.md (footer lives in config.ts)
// - generates .vitepress/sidebar.ts from _Sidebar.md
//
// Idempotent: re-running overwrites the generated pages + sidebar. Hand-written
// files (index.md, config.ts) are never touched.
//
// Usage: npm run migrate   (expects the wiki clone at ../wickra.wiki)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS = path.resolve(__dirname, '..')
const WIKI = path.resolve(DOCS, '..', 'wickra.wiki')

const CURRENT_VERSION = '0.3.1'
const OLD_VERSION = '0.2.7'

if (!fs.existsSync(WIKI)) {
  console.error(`Wiki clone not found at ${WIKI}. Clone wickra-lib/wickra.wiki next to this repo.`)
  process.exit(1)
}

const INDICATORS_DIR = path.join(DOCS, 'Indicators')

// Catalogue indicator pages live under Indicators/; Indicator-Chaining is a
// reference guide that stays at the docs root with the other guides.
const isCatalogueIndicator = (base) =>
  base.startsWith('Indicator-') && base !== 'Indicator-Chaining'

// Sidebar link target for a wiki page name (no extension).
const linkFor = (target) =>
  isCatalogueIndicator(target) ? '/Indicators/' + target : '/' + target

// The root guides a catalogue page can link back to. After the move these
// pages sit one level down, so such links have to be absolute to resolve.
const ROOT_PAGE_SLUGS = [
  'Indicators-Overview', 'Warmup-Periods', 'Streaming-vs-Batch',
  'Quickstart-Rust', 'Quickstart-Python', 'Quickstart-Node', 'Quickstart-WASM',
  'Data-Layer', 'TA-Lib-Migration', 'Cookbook', 'FAQ',
]

/** Org-migration + misc content fixes applied to every page. */
function transform(content) {
  return content.replaceAll('kingchenc/wickra', 'wickra-lib/wickra')
}

// Rewrite the wiki's relative `](Page)` links to the absolute paths VitePress
// serves after the catalogue moved under Indicators/. Catalogue links become
// /Indicators/Indicator-*, the chaining guide stays at /Indicator-Chaining, and
// for catalogue pages (`moved`) the back-links to the root guides are made
// absolute as well. Mirrors the one-time sed rewrite of the existing pages so a
// re-run reproduces the committed tree exactly.
function rewriteLinks(content, moved) {
  let s = content
    .replaceAll('](Indicator-Chaining', '](@@CHAIN@@')
    .replaceAll('](Indicator-', '](/Indicators/Indicator-')
    .replaceAll('](@@CHAIN@@', '](/Indicator-Chaining')
  if (moved) {
    for (const slug of ROOT_PAGE_SLUGS) {
      s = s.replaceAll('](' + slug, '](/' + slug)
    }
  }
  return s
}

const files = fs.readdirSync(WIKI).filter((f) => f.endsWith('.md'))
const SPECIAL = new Set(['_Sidebar.md', '_Footer.md', 'Home.md'])

let copied = 0
for (const f of files) {
  if (SPECIAL.has(f)) continue
  const base = f.replace(/\.md$/, '')
  const moved = isCatalogueIndicator(base)
  const dest = moved ? INDICATORS_DIR : DOCS
  fs.mkdirSync(dest, { recursive: true })
  const src = fs.readFileSync(path.join(WIKI, f), 'utf8')
  fs.writeFileSync(path.join(dest, f), rewriteLinks(transform(src), moved))
  copied++
}

// Home.md -> overview.md (index.md is the hero landing). Bump the version table.
{
  const home = transform(fs.readFileSync(path.join(WIKI, 'Home.md'), 'utf8'))
  const bumped = home.replaceAll(OLD_VERSION, CURRENT_VERSION)
  fs.writeFileSync(path.join(DOCS, 'overview.md'), rewriteLinks(bumped, false))
  copied++
}

// _Sidebar.md -> .vitepress/sidebar.ts
const sidebarSrc = fs.readFileSync(path.join(WIKI, '_Sidebar.md'), 'utf8')
const groups = []
let current = null
const linkRe = /^-\s*\[([^\]]+)\]\(([^)]+)\)\s*$/
// Indicator families are long; collapse them by default. Keep the intro
// groups (Getting started / Reference / Guides) expanded.
const EXPANDED = new Set(['Getting started', 'Reference', 'Guides'])

for (const raw of sidebarSrc.split(/\r?\n/)) {
  const line = raw.trim()
  const h3 = line.match(/^###\s+(.*)$/)
  if (h3) {
    current = { text: h3[1].trim(), collapsed: !EXPANDED.has(h3[1].trim()), items: [] }
    groups.push(current)
    continue
  }
  const m = line.match(linkRe)
  if (m && current) {
    const label = m[1].trim()
    const target = m[2].trim()
    // Skip the standalone Home link; index.md is the landing.
    if (target === 'Home') continue
    current.items.push({ text: label, link: '/' + target })
  }
}

const nonEmpty = groups.filter((g) => g.items.length > 0)
const banner =
  '// AUTO-GENERATED by scripts/migrate-wiki.mjs from the wiki _Sidebar.md.\n' +
  '// Do not hand-edit — re-run `npm run migrate` instead.\n'
const out =
  banner +
  'export const sidebar = ' +
  JSON.stringify(nonEmpty, null, 2) +
  '\n'
fs.mkdirSync(path.join(DOCS, '.vitepress'), { recursive: true })
fs.writeFileSync(path.join(DOCS, '.vitepress', 'sidebar.ts'), out)

console.log(`Migrated ${copied} pages.`)
console.log(`Generated sidebar with ${nonEmpty.length} groups, ` +
  `${nonEmpty.reduce((n, g) => n + g.items.length, 0)} links.`)
