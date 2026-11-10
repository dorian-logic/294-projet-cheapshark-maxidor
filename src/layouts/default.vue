<!--
  layouts/default.vue

  The frame around every page: top bar, main content area, footer.
  <router-view /> is where the current page is displayed: pages/index.vue
  at "/", pages/deals/[id].vue at "/deals/12", etc. The router picks it from the URL.
-->
<template>
  <AppHeader />

  <v-main>
    <router-view />
  </v-main>

  <AppFooter />

  <!-- The app's ONE snackbar (small message at the bottom of the screen),
       e.g. "Added to favorites". Its text is in the store (dealsStore.notify),
       so any component can show a message. It hides itself after 2 seconds:
       v-model sets `visible` back to false. -->
  <v-snackbar v-model="dealsStore.snackbar.visible" color="primary" :timeout="2000">
    {{ dealsStore.snackbar.text }}
  </v-snackbar>
</template>

<script setup>
  // Explicit imports (they would also be auto-imported from src/components)
  import AppFooter from '@/components/AppFooter.vue'
  import AppHeader from '@/components/AppHeader.vue'
  import { useDealsStore } from '@/stores/deals'

  const dealsStore = useDealsStore()
</script>
