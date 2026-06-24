<p align="center">
  <a href="https://wickra.org"><img src="https://raw.githubusercontent.com/wickra-lib/.github/main/profile/wickra-banner.webp?v=514" alt="Wickra — streaming-first technical indicators" width="100%"></a>
</p>

[![Indicators](https://img.shields.io/badge/indicators-514-3b82f6)](https://github.com/wickra-lib/wickra)
[![Live demo](https://img.shields.io/badge/live%20demo-live.wickra.org-3b82f6)](https://live.wickra.org)
[![Docs](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/docs.svg)](https://docs.wickra.org)
[![Verified across 10 languages](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/verified.svg)](https://docs.wickra.org/FAQ#do-all-the-language-bindings-compute-the-same-values)
[![License: MIT OR Apache-2.0](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/license.svg)](https://github.com/wickra-lib/wickra#license)
[![Built with VitePress](https://img.shields.io/badge/built%20with-VitePress-5c73e7?logo=vite&logoColor=white)](https://vitepress.dev)

Documentation site for [Wickra](https://github.com/wickra-lib/wickra) —
streaming-first technical indicators. Built with [VitePress](https://vitepress.dev),
deployed via **Cloudflare Pages**.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output -> .vitepress/dist
npm run preview  # serve the built site
```

Requires Node 22 (see `.nvmrc`).

## Content

Pages are plain Markdown at the repo root. The indicator deep-dives
(`Indicator-*.md`), quickstarts, and reference pages were migrated from the
former GitHub Wiki. The sidebar (`.vitepress/sidebar.ts`) is **generated** —
do not hand-edit it.

### Re-running the wiki migration

The migration script expects the wiki clone at `../wickra.wiki`:

```bash
npm run migrate   # copies pages + regenerates .vitepress/sidebar.ts
```

It rewrites `kingchenc/wickra` → `wickra-lib/wickra`, bumps the version table,
and turns `Home.md` into `overview.md` (`index.md` is the hand-written hero).

## Deployment (Cloudflare Pages)

Connect this repo in Cloudflare → Workers & Pages → Pages → Connect to Git.

| Setting | Value |
|---|---|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `.vitepress/dist` |
| Node version | `20` (env `NODE_VERSION` or `.nvmrc`) |

Every push to `main` redeploys production; every PR gets a preview deployment.

## Notes

- `base: '/'` — served at a domain root (e.g. `docs.wickra.org`), **not** the
  `/wickra/` sub-path the marketing `site/` uses.
- `ignoreDeadLinks: true` is set for now; tighten once the link transform is
  finalised and the link-check CI lands.
