<!--
  pages/about.vue

  The "About" page, at /about (file-based routing: the file name becomes the
  address). Static content: what the app does, where the data comes from,
  and which technologies it uses.
-->
<template>
  <v-container>
    <h1 class="text-h4 font-weight-bold mt-6 mb-6">
      About
    </h1>

    <v-card class="pa-2" max-width="800" rounded="lg" variant="flat">
      <v-card-text class="text-body-1">
        <p class="mb-4">
          CheapShark Deal Finder helps you find the best discounts on PC games.
          Search by name, filter by store, maximum price and minimum discount,
          sort the results, and keep the deals you like in your favorites.
        </p>

        <p class="mb-4">
          The deals come from
          <a href="https://www.cheapshark.com" rel="noopener noreferrer" target="_blank">CheapShark</a>,
          through the school's copy of its API
          (<code>apis.divtec.me/api/cheapshark</code>). Prices are in US dollars.
          Your favorites are saved in this browser only.
        </p>

        <p class="mb-2">
          School project for module 294, built with:
        </p>

        <!-- One chip per technology, generated from the array below -->
        <div class="d-flex flex-wrap ga-2">
          <v-chip
            v-for="technology in technologies"
            :key="technology"
            label
            variant="tonal"
          >
            {{ technology }}
          </v-chip>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
  const technologies = ['Vue.js 3', 'Vuetify 3', 'Pinia', 'Vue Router', 'Axios', 'Vite']
</script>
