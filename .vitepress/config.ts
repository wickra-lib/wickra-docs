import { defineConfig } from 'vitepress'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
// Sidebar is generated from the migrated wiki's _Sidebar.md by
// `npm run migrate` — see scripts/migrate-wiki.mjs. Regenerate it whenever the
// indicator catalogue changes; do not hand-edit sidebar.ts.
import { sidebar } from './sidebar'

// Versioning (findings P8.5): latest-only — Git is the version history, the nav
// just surfaces the current published version. The string is read at build time
// from the single source that the release automation already maintains (the
// `wickra` row of the Published-versions table in overview.md, synced on every
// v* tag by sync-about.yml), so the nav label can never drift from the table.
const overview = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../overview.md'),
  'utf-8',
)
const versionMatch = overview.match(
  /^\|\s*crates\.io\s*\|\s*`wickra`\s*\|\s*([0-9]+\.[0-9]+\.[0-9]+)/m,
)
const version = versionMatch ? versionMatch[1] : 'latest'

export default defineConfig({
  title: 'Wickra',
  description:
    'Streaming-first technical indicators. Rust core with Python, Node, and WASM bindings. 214 indicators, install-free.',
  lang: 'en-US',

  // Served at the domain root (e.g. docs.wickra.org), so the base is '/'.
  // NOTE: do NOT copy `base: '/wickra/'` from the marketing `site/` — that one
  // is served under a GitHub Pages sub-path; this docs site is not.
  base: '/',
  cleanUrls: true,

  // Internal links are now tightened (findings P8.2): the build fails on any
  // dead relative link, so `npm run build` in ci.yml is the internal-link gate
  // on every PR. External http(s) URLs are checked separately on a schedule by
  // links.yml (third-party rot is non-deterministic, so it does not block PRs).
  ignoreDeadLinks: false,

  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['meta', { name: 'theme-color', content: '#0ea5e9' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Wickra Documentation' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          '214 streaming-first technical indicators. Rust core, Python / Node / WASM bindings.',
      },
    ],
    ['meta', { property: 'og:image', content: 'https://docs.wickra.org/og-banner.webp' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://docs.wickra.org/og-banner.webp' }],
  ],

  themeConfig: {
    siteTitle: 'Wickra',
    logo: { src: '/wickra-mark.svg', alt: 'Wickra' },

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Overview', link: '/overview' },
      {
        text: 'Quickstart',
        items: [
          { text: 'Rust', link: '/Quickstart-Rust' },
          { text: 'Python', link: '/Quickstart-Python' },
          { text: 'Node', link: '/Quickstart-Node' },
          { text: 'WASM', link: '/Quickstart-WASM' },
        ],
      },
      { text: 'Indicators', link: '/Indicators-Overview' },
      {
        text: 'Links',
        items: [
          { text: 'Changelog', link: 'https://github.com/wickra-lib/wickra/blob/main/CHANGELOG.md' },
          { text: 'crates.io', link: 'https://crates.io/crates/wickra' },
          { text: 'PyPI', link: 'https://pypi.org/project/wickra/' },
          { text: 'npm', link: 'https://www.npmjs.com/package/wickra' },
        ],
      },
      {
        text: `v${version}`,
        items: [
          {
            text: 'Release notes',
            link: 'https://github.com/wickra-lib/wickra/releases',
          },
          {
            text: 'Changelog',
            link: 'https://github.com/wickra-lib/wickra/blob/main/CHANGELOG.md',
          },
        ],
      },
    ],

    sidebar,

    search: { provider: 'local' },

    socialLinks: [{ icon: 'github', link: 'https://github.com/wickra-lib/wickra' }],

    editLink: {
      pattern: 'https://github.com/wickra-lib/wickra-docs/edit/main/:path',
      text: 'Edit this page on GitHub',
    },

    outline: { level: [2, 3] },

    // The footer is rendered by a custom component (theme/SiteFooter.vue via
    // the layout-bottom slot) so it can carry the badge row + the per-page
    // "Updated" date, which a static themeConfig.footer string cannot. Kept
    // visually identical to the wickra.org footer.
  },
})
