<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

// Repo-status badges mirrored from the GitHub wickra README, rendered as the
// top row of the site footer (kept identical to the wickra.org footer). The
// SVGs and their intrinsic dimensions are snapshotted into public/badges/ +
// this manifest by scripts/fetch-badges.mjs (refreshed hourly by
// .github/workflows/refresh-badges.yml), so the row is served same-origin with
// reserved space — it paints with the page instead of popping in, no reflow.
import badges from './badges.json'

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
      ><img :src="b.file" :alt="b.alt" :width="b.width" :height="b.height" loading="eager" decoding="async" /></a>
    </div>
    <p class="wk-footer-meta">
      Released under the MIT OR Apache-2.0 license — not a trading system, use at your own risk.
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
