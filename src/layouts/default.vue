<!--
  layouts/default.vue

  The frame around every page: top bar, main content area, footer.
  <router-view /> is where the current page is displayed: pages/index.vue
  at "/", pages/deals/[id].vue at "/deals/12", etc. The router picks it from the URL.
-->
<template>
  <!-- `flat` + `border="b"`: no shadow, just a thin line under the bar.
       Without a `color`, the bar uses the theme's surface colour, so it is
       light in light mode and dark in dark mode. -->
  <v-app-bar border="b" density="comfortable" flat>
    <template #prepend>
      <v-icon class="ml-2" color="success" icon="mdi-tag-multiple" />
    </template>
    <v-app-bar-title class="font-weight-bold">
      <!-- The app name is a link to the home page (the deal list) -->
      <router-link class="app-title" to="/">
        CheapShark Deal Finder
      </router-link>
    </v-app-bar-title>

    <!-- NAVIGATION: `to` turns a button into a router link.
         On phones (xs) only the icons are shown, to save space. -->
    <template #append>
      <!-- `exact`: only highlighted on "/" itself (every path starts with "/") -->
      <v-btn exact prepend-icon="mdi-tag-outline" to="/">
        <span class="d-none d-sm-inline">Deals</span>
      </v-btn>
      <v-btn class="mr-2" to="/favorites">
        <!-- Badge = small bubble with the number of favorites.
             :model-value hides it when there are none. -->
        <v-badge
          color="red"
          :content="dealsStore.favorites.length"
          :model-value="dealsStore.favorites.length > 0"
        >
          <v-icon icon="mdi-heart-outline" />
        </v-badge>
        <span class="d-none d-sm-inline ml-2">Favorites</span>
      </v-btn>
    </template>
  </v-app-bar>

  <v-main>
    <router-view />
  </v-main>

  <AppFooter />
</template>

<script setup>
  import { useDealsStore } from '@/stores/deals'

  // Used for the number of favorites in the menu's badge
  const dealsStore = useDealsStore()
</script>

<style scoped>
  /* The title is a link: keep the bar's text colour instead of link blue */
  .app-title {
    color: inherit;
    text-decoration: none;
    letter-spacing: 0.01em;
  }
</style>
