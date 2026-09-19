<p align="center">
  <a href="https://wickra.org"><img src="https://raw.githubusercontent.com/wickra-lib/.github/main/profile/wickra-banner.webp?v=514-7" alt="Wickra — streaming-first technical indicators" width="100%"></a>
</p>

[![Indicators](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-docs/indicators.svg)](https://github.com/wickra-lib/wickra)
[![Live demo](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-docs/live-demo.svg)](https://live.wickra.org)
[![Docs](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra/docs.svg)](https://docs.wickra.org)
[![Verified across 10 languages](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra/verified.svg)](https://docs.wickra.org/FAQ#do-all-the-language-bindings-compute-the-same-values)
[![License: MIT OR Apache-2.0](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra/license.svg)](https://github.com/wickra-lib/wickra#license)
[![Built with VitePress](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-docs/vitepress.svg)](https://vitepress.dev)

---

Documentation site for [Wickra](https://github.com/wickra-lib/wickra) —
streaming-first technical indicators. Built with [VitePress](https://vitepress.dev),
deployed via **Cloudflare Pages**.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output -> .vitepress/dist
npm run preview  # serve the built site
```

Requires Node 22 (see `.nvmrc`).

## What is kept current by workflow

- **The indicator count and the released version** — the headline count on the
  landing page and in `overview.md`, the version table, the crate version in
  `Quickstart-Rust.md` and the Maven snippet in `Quickstart-Java.md` — are pulled
  hourly from [wickra](https://github.com/wickra-lib/wickra) by
  `sync-from-wickra.yml` (the count is derived from the core's re-export block,
  the version from its latest release).
- **The page-derived counts** — per-family indicator counts, the sidebar groups
  and "N deep-dive pages" — are owned by `scripts/sync-doc-counts.mjs`; CI fails
  when they disagree with the pages, and `node scripts/sync-doc-counts.mjs`
  rewrites them.
- **The status badges** in the footer are snapshots refreshed hourly by
  `refresh-badges.yml`; the SVGs in `public/badges/` are generated, not edited.

Everything else — every page, the hand-seeded sidebar groups (Getting started,
Reference, Guides) — is edited here by hand.

## Content

Pages are plain Markdown at the repo root; the indicator deep-dives live under
`Indicators/`. The sidebar (`.vitepress/sidebar.ts`) is half generated: the
indicator-family groups are written by `scripts/sync-doc-counts.mjs` from the
pages that exist, the other groups (Getting started, Reference, Guides) are
edited by hand. CI compiles every Rust snippet and runs the Python and Node
ones against the published packages, so a page's code is code that works.

## Deploy

Static build via Cloudflare Pages (Git integration, no deploy secret).

| Setting | Value |
|---|---|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `.vitepress/dist` |
| Node version | `22` (`.nvmrc`) |

Every push to `main` redeploys production; every PR gets a preview deployment.

## License

Dual-licensed under [MIT](https://github.com/wickra-lib/wickra/blob/main/LICENSE-MIT) or [Apache-2.0](https://github.com/wickra-lib/wickra/blob/main/LICENSE-APACHE), at your option.
