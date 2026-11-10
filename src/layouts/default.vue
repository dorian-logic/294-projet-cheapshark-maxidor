<!--
  layouts/default.vue

  The frame around every page: top bar, main content area, footer.
  <router-view /> is where the current page is displayed: pages/index.vue
  at "/", pages/deals/[id].vue at "/deals/12", etc. The router picks it from the URL.
-->
<template>
  <!-- `flat` + `border="b"`: no shadow, just a thin line under the bar.
       The bar is semi-transparent and blurs what's behind it (see the
       <style> block), so the cards slide underneath it when scrolling. -->
  <v-app-bar border="b" class="app-bar" density="comfortable" flat>
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
        <!-- Badge = small bubble with the number of NEW favorites, added
             since the favorites page was last opened. It's a "something new"
             signal, not a total (the favorites page shows the total).
             :model-value hides it when there's nothing new. -->
        <v-badge
          color="red"
          :content="dealsStore.unseenFavorites.length"
          :model-value="dealsStore.unseenFavorites.length > 0"
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

  // Used for the number of new favorites in the menu's badge
  const dealsStore = useDealsStore()
</script>

<style scoped>
  /* Semi-transparent bar + blur ("frosted glass").
     rgba(var(--v-theme-surface), 0.75) = the theme's surface colour at 75 %
     opacity: Vuetify exposes every theme colour as a CSS variable holding
     "r,g,b", so this works in both dark and light mode.
     !important is needed because Vuetify sets the bar's background itself.
     The `noinspection` comment below is for WebStorm only: Vuetify creates
     --v-theme-surface in the browser at runtime, so the IDE can't find it in
     our files and would wrongly report it as an error. */
  /* noinspection CssUnresolvedCustomProperty */
  .app-bar {
    background: rgba(var(--v-theme-surface), 0.75) !important;
    backdrop-filter: blur(12px);
  }

  /* The title is a link: keep the bar's text colour instead of link blue */
  .app-title {
    color: inherit;
    text-decoration: none;
    letter-spacing: 0.01em;
  }
</style>
