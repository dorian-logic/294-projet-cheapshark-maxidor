<!--
  layouts/default.vue

  The frame around every page: top bar, main content area, footer.
  <router-view /> is where the current page is displayed: pages/index.vue
  at "/", pages/deals/[id].vue at "/deals/12", etc. The router picks it from the URL.
-->
<template>
  <v-app-bar color="primary" density="comfortable">
    <template #prepend>
      <v-icon class="ml-2" icon="mdi-tag-multiple" />
    </template>
    <v-app-bar-title class="font-weight-bold">
      <!-- The app name is a link to the home page (the deal list) -->
      <router-link class="text-decoration-none text-white" to="/">
        CheapShark Deal Finder
      </router-link>
    </v-app-bar-title>
  </v-app-bar>

  <v-main>
    <router-view />
  </v-main>

  <AppFooter />
</template>

<script setup>
  //
</script>
