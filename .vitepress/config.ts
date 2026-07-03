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
// The first cell is a markdown link (`[crates.io](…)`), so match on the cell
// containing "crates.io" rather than the bare word.
const versionMatch = overview.match(
  /^\|[^|\n]*crates\.io[^|\n]*\|\s*`wickra`\s*\|\s*([0-9]+\.[0-9]+\.[0-9]+)/m,
)
const version = versionMatch ? versionMatch[1] : 'latest'

// JSON-LD structured data (Organization + SoftwareApplication) so search
// engines and LLM crawlers can resolve the project's entity, ownership, and
// where it is published. Emitted once in the document <head> below.
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://docs.wickra.org/#organization',
      name: 'Wickra',
      url: 'https://wickra.org/',
      logo: 'https://docs.wickra.org/wickra-mark.svg',
      sameAs: [
        'https://github.com/wickra-lib/wickra',
        'https://crates.io/crates/wickra',
        'https://pypi.org/project/wickra/',
        'https://www.npmjs.com/package/wickra',
      ],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://wickra.org/#software',
      name: 'Wickra',
      url: 'https://wickra.org/',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Windows, macOS, Linux, WebAssembly',
      programmingLanguage: ['Rust', 'Python', 'JavaScript', 'WebAssembly', 'C', 'C++', 'C#', 'Go', 'Java', 'R'],
      description:
        'Streaming-first technical indicators. Native Rust, Python, Node.js, WASM + C ABI hub → C, C++, C#, Go, Java, R. Same code for backtesting and live ticks.',
      license: 'https://github.com/wickra-lib/wickra#license',
      publisher: { '@id': 'https://docs.wickra.org/#organization' },
    },
  ],
}

export default defineConfig({
  title: 'Wickra',
  description:
    'Streaming-first technical indicators. Native Rust, Python, Node.js, WASM + C ABI hub → C, C++, C#, Go, Java, R — 514 indicators, install-free. Same code for backtest and live tick.',
  lang: 'en-US',

  // Served at the domain root (e.g. docs.wickra.org), so the base is '/'.
  // NOTE: do NOT copy `base: '/wickra/'` from the marketing `site/` — that one
  // is served under a GitHub Pages sub-path; this docs site is not.
  base: '/',
  cleanUrls: true,

  // Sitemap is emitted into the build output by VitePress' built-in generator
  // (no extra dependency); CF Pages serves dist/sitemap.xml at the domain root.
  // <lastmod> per page comes from `lastUpdated` (Git). robots.txt points here.
  sitemap: { hostname: 'https://docs.wickra.org' },

  // README.md is repo documentation, not a site page — keep it out of the build
  // so it never becomes a /README route or a stray sitemap entry.
  srcExclude: ['README.md'],

  // Internal links are now tightened (findings P8.2): the build fails on any
  // dead relative link, so `npm run build` in ci.yml is the internal-link gate
  // on every PR. External http(s) URLs are checked separately on a schedule by
  // links.yml (third-party rot is non-deterministic, so it does not block PRs).
  ignoreDeadLinks: false,

  lastUpdated: true,

  head: [
    // SVG favicon first: modern browsers prefer the scalable mark, which fills
    // the tab edge-to-edge. The .ico/.png below are rendered from the same
    // transparent mark (not the dark-square avatar), so the hexagon is large at
    // every size instead of floating in padding. .ico is the legacy fallback.
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/wickra-mark.svg' }],
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    // PWA manifest with 192/512 hexagon icons so Android / installable contexts
    // get a real icon instead of a generic placeholder.
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['meta', { name: 'theme-color', content: '#0ea5e9' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Wickra Documentation' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          '514 streaming-first technical indicators. Rust core, Python / Node.js / WASM / C / C++ / C# / Go / Java / R bindings.',
      },
    ],
    ['meta', { property: 'og:image', content: 'https://docs.wickra.org/og-banner.webp' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://docs.wickra.org/og-banner.webp' }],
    ['script', { type: 'application/ld+json' }, JSON.stringify(structuredData)],
  ],

  // VitePress emits neither a canonical link nor a per-page og:url on its own;
  // derive both from each page's path so every URL self-references its clean,
  // apex-domain canonical (consistent with `cleanUrls: true`).
  transformPageData(pageData, { siteConfig }) {
    const path = pageData.relativePath.replace(/(?:index)?\.md$/, '')
    const canonical = `https://docs.wickra.org/${path}`
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(
      ['link', { rel: 'canonical', href: canonical }],
      ['meta', { property: 'og:url', content: canonical }],
    )

    // Per-page meta description. Without one, every page falls back to the
    // global site description, so all 500+ structurally-identical indicator
    // pages ship a byte-identical <meta name="description">. Search engines
    // read that (plus the shared template) as near-duplicate content and
    // override the declared self-canonical — Search Console reports "Duplicate,
    // Google chose a different canonical" and leaves the pages unindexed.
    // Derive a unique description from the page's H1 title + its opening summary
    // blockquote (every indicator page starts with one). Pages without a leading
    // blockquote (or with an explicit frontmatter description) keep the global.
    if (!pageData.frontmatter.description) {
      try {
        const src = readFileSync(resolve(siteConfig.srcDir, pageData.relativePath), 'utf-8')
        const body = src.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
        const quote = body.match(/^[ \t]{0,3}>\s?(.+(?:\r?\n[ \t]{0,3}>\s?.+)*)/m)
        if (quote) {
          const summary = quote[1]
            .replace(/\r?\n[ \t]{0,3}>\s?/g, ' ')
            .replace(/[`*_]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
          const title = (pageData.title || '').trim()
          let desc =
            title && !summary.toLowerCase().startsWith(title.toLowerCase())
              ? `${title} — ${summary}`
              : summary
          if (desc.length > 200) desc = `${desc.slice(0, 197).replace(/\s+\S*$/, '')}…`
          if (desc) {
            pageData.description = desc
            pageData.frontmatter.description = desc
          }
        }
      } catch {
        // Fall back to the global site description.
      }
    }
  },

  themeConfig: {
    siteTitle: 'Wickra',
    logo: { src: '/wickra-mark.svg', alt: 'Wickra' },

    // The header logo + site title link to the marketing site root, not the docs
    // root. VitePress defaults logoLink to the docs home ('/'), which on
    // docs.wickra.org loops back to docs.wickra.org/ instead of going "home" to
    // the apex domain. Point it at wickra.org so the brand mark behaves as a
    // back-to-site affordance, consistent with the nav (Demo/Benchmarks/API all
    // point at wickra.org).
    logoLink: 'https://wickra.org/',

    // Shared top-level nav, kept 1:1 with the marketing site (wickra.org).
    // On-site targets are relative (SPA navigation); targets that live on the
    // marketing site are absolute. wickra.org mirrors this list with the
    // resolution flipped.
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Demo', link: 'https://wickra.org/demo' },
      { text: 'Benchmarks', link: 'https://wickra.org/benchmarks' },
      { text: 'Overview', link: '/overview' },
      {
        text: 'Quickstart',
        items: [
          { text: 'Rust', link: '/Quickstart-Rust' },
          { text: 'Python', link: '/Quickstart-Python' },
          { text: 'Node', link: '/Quickstart-Node' },
          { text: 'WASM', link: '/Quickstart-WASM' },
          { text: 'C', link: '/Quickstart-C' },
          { text: 'C#', link: '/Quickstart-CSharp' },
          { text: 'Go', link: '/Quickstart-Go' },
          { text: 'Java', link: '/Quickstart-Java' },
          { text: 'R', link: '/Quickstart-R' },
        ],
      },
      { text: 'Indicators', link: '/Indicators-Overview' },
      {
        text: 'API',
        items: [
          { text: 'Rust', link: 'https://wickra.org/api/rust' },
          { text: 'Python', link: 'https://wickra.org/api/python' },
          { text: 'Node', link: 'https://wickra.org/api/node' },
          { text: 'WASM', link: 'https://wickra.org/api/wasm' },
          { text: 'C', link: 'https://wickra.org/api/c' },
          { text: 'C#', link: 'https://wickra.org/api/csharp' },
          { text: 'Go', link: 'https://wickra.org/api/go' },
          { text: 'Java', link: 'https://wickra.org/api/java' },
          { text: 'R', link: 'https://wickra.org/api/r' },
        ],
      },
      {
        text: 'Links',
        items: [
          { text: 'crates.io', link: 'https://crates.io/crates/wickra' },
          { text: 'PyPI', link: 'https://pypi.org/project/wickra/' },
          { text: 'npm', link: 'https://www.npmjs.com/package/wickra' },
          { text: 'NuGet', link: 'https://www.nuget.org/packages/Wickra' },
          { text: 'Maven Central', link: 'https://central.sonatype.com/artifact/org.wickra/wickra' },
          { text: 'Go module', link: 'https://pkg.go.dev/github.com/wickra-lib/wickra-go' },
          { text: 'r-universe', link: 'https://wickra-lib.r-universe.dev' },
        ],
      },
      {
        text: `v${version}`,
        items: [
          { text: 'Release notes', link: 'https://github.com/wickra-lib/wickra/releases' },
          { text: 'Changelog', link: 'https://github.com/wickra-lib/wickra/blob/main/CHANGELOG.md' },
          { text: 'Docs', link: 'https://docs.wickra.org/' },
          { text: 'docs.rs', link: 'https://docs.rs/wickra/latest/wickra/' },
        ],
      },
    ],

    sidebar,

    search: { provider: 'local' },

    socialLinks: [{ icon: 'github', link: 'https://github.com/wickra-lib/wickra' }],

    outline: { level: [2, 3] },

    // The footer is rendered by a custom component (theme/SiteFooter.vue via
    // the layout-bottom slot) so it can carry the badge row + the per-page
    // "Updated" date, which a static themeConfig.footer string cannot. Kept
    // visually identical to the wickra.org footer.
  },
})
