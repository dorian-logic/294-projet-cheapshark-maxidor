<!--
  layouts/default.vue

  The frame around every page: top bar, main content area, footer.
  <router-view /> is where the current page (pages/index.vue) is displayed.
-->
<template>
  <v-app-bar color="primary" density="comfortable">
    <template #prepend>
      <v-icon class="ml-2" icon="mdi-tag-multiple" />
    </template>
    <v-app-bar-title class="font-weight-bold">
      CheapShark Deal Finder
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
