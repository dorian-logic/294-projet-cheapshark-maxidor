<!--
  pages/[...path].vue

  The "404 - page not found" page.

  [...path] is a "catch-all" route: it matches ANY address that no other
  page matches (e.g. /something/wrong). The router always prefers the more
  specific routes (/ and /deals/:id), so this page is only used as a last resort.
-->
<template>
  <v-container class="py-12 text-center">
    <v-icon color="grey" icon="mdi-map-marker-question-outline" size="80" />
    <h1 class="text-h4 font-weight-bold mt-4">
      Page not found
    </h1>
    <p class="text-medium-emphasis mt-2 mb-6">
      The address "{{ route.fullPath }}" doesn't exist.
    </p>
    <v-btn color="primary" prepend-icon="mdi-home" to="/">
      Back to the deals
    </v-btn>
  </v-container>
</template>

<script setup>
  import { useRoute } from 'vue-router'

  // Gives access to the current address, to show it in the message.
  const route = useRoute()
</script>
