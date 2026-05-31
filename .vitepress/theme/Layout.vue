<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import SiteFooter from './SiteFooter.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <!-- Replace the default global footer with our own (badges + license +
         copyright + per-page "Updated" date). The built-in VPFooter / the
         doc-footer "Updated" line are hidden in custom.css. -->
    <template #layout-bottom>
      <SiteFooter />
    </template>
  </Layout>
</template>
