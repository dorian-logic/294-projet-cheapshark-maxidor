<!--
  AppHeader.vue

  The top bar: app name (link to the home page) + navigation menu.
  It's displayed on every page because layouts/default.vue includes it.

  The menu is built from the `menuItems` array with v-for: adding a page to
  the menu = adding one line to the array.
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

    <!-- NAVIGATION: one button per menu item. `:to` turns a button into a
         router link (no page reload). `exact`: the "/" button is only
         highlighted on "/" itself, not on every page (every path starts
         with "/"). On phones (xs) only the icons are shown, to save space. -->
    <template #append>
      <v-btn
        v-for="item in menuItems"
        :key="item.path"
        :aria-label="item.title"
        class="mr-1"
        :exact="item.path === '/'"
        :to="item.path"
      >
        <!-- Badge on the favorites item only: number of NEW favorites,
             added since the favorites page was last opened. It's a
             "something new" signal, not a total (the favorites page shows
             the total). :model-value hides it when there's nothing new. -->
        <v-badge
          v-if="item.path === '/favorites'"
          color="red"
          :content="dealsStore.unseenFavorites.length"
          :model-value="dealsStore.unseenFavorites.length > 0"
        >
          <v-icon :icon="item.icon" />
        </v-badge>
        <v-icon v-else :icon="item.icon" />
        <span class="d-none d-sm-inline ml-2">{{ item.title }}</span>
      </v-btn>
    </template>
  </v-app-bar>
</template>

<script setup>
  import { useDealsStore } from '@/stores/deals'

  // Used for the number of new favorites in the badge
  const dealsStore = useDealsStore()

  // The menu: title shown, address (route) and icon of each page.
  // Icons: Material Design Icons, https://pictogrammers.com/library/mdi/
  const menuItems = [
    { title: 'Deals', path: '/', icon: 'mdi-tag-outline' },
    { title: 'Favorites', path: '/favorites', icon: 'mdi-heart-outline' },
    { title: 'About', path: '/about', icon: 'mdi-information-outline' },
  ]
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
