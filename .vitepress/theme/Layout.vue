<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import SiteFooter from './SiteFooter.vue'
import BackToTop from './BackToTop.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <!-- Brand banner above the hero on the home page (the same artwork used as
         the og:image, auto-regenerated with the indicator count at build). -->
    <template #home-hero-before>
      <div class="wk-hero-banner">
        <img
          src="/og-banner.png"
          alt="Wickra — streaming-first technical indicators"
          width="1280"
          height="640"
        />
      </div>
    </template>

    <!-- Replace the default global footer with our own (badges + license +
         copyright + per-page "Updated" date), rendered as a fixed bar, plus a
         floating back-to-top control. The built-in VPFooter / the doc-footer
         "Updated" line are hidden in custom.css. -->
    <template #layout-bottom>
      <SiteFooter />
      <BackToTop />
    </template>
  </Layout>
</template>
