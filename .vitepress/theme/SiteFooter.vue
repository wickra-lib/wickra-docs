<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

// Repo-status badges mirrored from the GitHub wickra README, rendered as the
// top row of the site footer (kept identical to the wickra.org footer).
const badges = [
  { alt: 'CI', src: 'https://github.com/wickra-lib/wickra/actions/workflows/ci.yml/badge.svg', href: 'https://github.com/wickra-lib/wickra/actions/workflows/ci.yml' },
  { alt: 'CodeQL', src: 'https://github.com/wickra-lib/wickra/actions/workflows/codeql.yml/badge.svg', href: 'https://github.com/wickra-lib/wickra/actions/workflows/codeql.yml' },
  { alt: 'codecov', src: 'https://codecov.io/gh/wickra-lib/wickra/branch/main/graph/badge.svg', href: 'https://codecov.io/gh/wickra-lib/wickra' },
  { alt: 'GitHub release', src: 'https://img.shields.io/github/v/release/wickra-lib/wickra?logo=github&color=green', href: 'https://github.com/wickra-lib/wickra/releases/latest' },
  { alt: 'crates.io', src: 'https://img.shields.io/crates/v/wickra.svg?logo=rust&color=orange', href: 'https://crates.io/crates/wickra' },
  { alt: 'PyPI', src: 'https://img.shields.io/pypi/v/wickra.svg?logo=pypi&color=blue', href: 'https://pypi.org/project/wickra/' },
  { alt: 'npm', src: 'https://img.shields.io/npm/v/wickra.svg?logo=npm&color=red', href: 'https://www.npmjs.com/package/wickra' },
  { alt: 'License: PolyForm-NC', src: 'https://img.shields.io/badge/license-PolyForm--NC--1.0.0-purple', href: 'https://github.com/wickra-lib/wickra/blob/main/LICENSE' },
  { alt: 'OpenSSF Scorecard', src: 'https://api.securityscorecards.dev/projects/github.com/wickra-lib/wickra/badge', href: 'https://scorecard.dev/viewer/?uri=github.com/wickra-lib/wickra' },
  { alt: 'Build provenance', src: 'https://img.shields.io/badge/provenance-attested-brightgreen?logo=github', href: 'https://github.com/wickra-lib/wickra/attestations' },
]

const { page } = useData()

// Format the page's git last-updated timestamp with UTC getters so the SSR
// render and the client hydration produce byte-identical output (toLocale*
// would drift between the Node build and the browser locale).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const updated = computed(() => {
  const t = page.value.lastUpdated
  if (!t) return ''
  const d = new Date(t)
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
})
</script>

<template>
  <footer class="wk-footer">
    <div class="wk-footer-badges">
      <a
        v-for="b in badges"
        :key="b.alt"
        :href="b.href"
        target="_blank"
        rel="noreferrer"
      ><img :src="b.src" :alt="b.alt" loading="lazy" /></a>
    </div>
    <p class="wk-footer-meta">
      Released under the PolyForm Noncommercial License 1.0.0 — not a trading system, use at your own risk.
    </p>
    <p class="wk-footer-meta wk-footer-meta-sub">
      <span>Copyright © 2026 kingchenc</span>
      <template v-if="updated">
        <span class="wk-sep">·</span>
        <span>Updated {{ updated }}</span>
      </template>
    </p>
  </footer>
</template>
