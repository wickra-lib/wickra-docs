/*
 * Generate public/og-banner.png from scripts/og-banner.svg, with the indicator
 * count taken from this site's own content (overview.md, which sync-about.yml
 * keeps current). Runs as a prebuild step, so the social-card banner is
 * regenerated on every deploy and can never drift from the count — no committed
 * PNG, no manual step. The generated file is git-ignored.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

// Count from the site's own content (kept in sync by sync-about.yml).
const content = readFileSync(resolve(root, 'overview.md'), 'utf-8')
const m = content.match(/(\d+)\s+indicators/i)
if (!m) {
  console.error('gen-og-banner: could not find the indicator count in overview.md')
  process.exit(1)
}
const count = m[1]

let svg = readFileSync(resolve(here, 'og-banner.svg'), 'utf-8')
svg = svg.replace(/\d+ indicators/g, `${count} indicators`)

const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1280 },
  font: { loadSystemFonts: true },
})
  .render()
  .asPng()

mkdirSync(resolve(root, 'public'), { recursive: true })
writeFileSync(resolve(root, 'public/og-banner.png'), png)
console.log(`gen-og-banner: wrote public/og-banner.png (${count} indicators)`)
