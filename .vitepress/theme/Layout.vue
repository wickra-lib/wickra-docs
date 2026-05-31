<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import SiteFooter from './SiteFooter.vue'
import BackToTop from './BackToTop.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
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
