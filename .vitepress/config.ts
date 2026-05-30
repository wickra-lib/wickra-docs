import { defineConfig } from 'vitepress'
// Sidebar is generated from the migrated wiki's _Sidebar.md by
// `npm run migrate` — see scripts/migrate-wiki.mjs. Regenerate it whenever the
// indicator catalogue changes; do not hand-edit sidebar.ts.
import { sidebar } from './sidebar'

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

  // v1: the migrated wiki uses GitHub-wiki short links; until the link
  // transform is fully tightened (findings P8.4) we don't fail the build on
  // dead links. Flip to `false` once the CI link-check lands.
  ignoreDeadLinks: true,

  lastUpdated: true,

  head: [
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
  ],

  themeConfig: {
    siteTitle: 'Wickra',

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
    ],

    sidebar,

    search: { provider: 'local' },

    socialLinks: [{ icon: 'github', link: 'https://github.com/wickra-lib/wickra' }],

    editLink: {
      pattern: 'https://github.com/wickra-lib/wickra-docs/edit/main/:path',
      text: 'Edit this page on GitHub',
    },

    outline: { level: [2, 3] },

    footer: {
      message:
        'Released under the PolyForm Noncommercial 1.0.0 License. ' +
        '<a href="https://crates.io/crates/wickra">crates.io</a> · ' +
        '<a href="https://pypi.org/project/wickra/">PyPI</a> · ' +
        '<a href="https://www.npmjs.com/package/wickra">npm</a>',
      copyright: 'Wickra — streaming-first technical indicators.',
    },
  },
})
