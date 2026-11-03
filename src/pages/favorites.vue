<!--
  pages/favorites.vue

  The favorites page, at /favorites (file-based routing: the file name
  becomes the address).

  It shows the deals the user marked with the heart. The list comes from the
  store getter `getFavorites`, which turns the saved IDs into full deal
  objects. The cards are the SAME DealCard component as on the home page:
  one component, reused in two places.
-->
<template>
  <v-container>
    <h1 class="text-h4 font-weight-bold mt-6 mb-1">
      Favorites
    </h1>
    <p class="text-medium-emphasis mb-6">
      Deals you marked with the heart, saved in this browser.
    </p>

    <!-- 1. LOADING (direct visit to /favorites: the deals aren't there yet) -->
    <div v-if="dealsStore.isLoading" class="text-center py-12">
      <v-progress-circular color="primary" indeterminate size="48" />
      <p class="mt-4 text-medium-emphasis">
        Loading deals...
      </p>
    </div>

    <!-- 2. NO FAVORITES: v-if / v-else on the length of the saved IDs -->
    <v-alert
      v-else-if="dealsStore.favorites.length === 0"
      icon="mdi-heart-outline"
      title="No favorites yet"
      type="info"
      variant="tonal"
    >
      Click the heart on a deal to add it here.
      <template #append>
        <v-btn to="/" variant="outlined">
          Browse deals
        </v-btn>
      </template>
    </v-alert>

    <!-- 3. THE FAVORITES: same grid and same card as the home page -->
    <template v-else>
      <p class="mb-4 text-medium-emphasis">
        {{ dealsStore.getFavorites.length }} favorite(s)
      </p>

      <v-row>
        <v-col
          v-for="deal in dealsStore.getFavorites"
          :key="deal.id"
          cols="12"
          lg="3"
          md="4"
          sm="6"
        >
          <DealCard
            :deal="deal"
            :store-logo="dealsStore.storeLogo(deal.store)"
          />
        </v-col>
      </v-row>

      <!-- Saved favorites whose deal isn't in the current data (offline with
           only the sample deals, or the deal is no longer on sale) -->
      <p v-if="hiddenCount > 0" class="mt-4 text-medium-emphasis">
        {{ hiddenCount }} favorite(s) can't be shown right now: offline, or no longer on sale.
      </p>
    </template>
  </v-container>
</template>

<script setup>
  import { computed } from 'vue'
  import { useDealsStore } from '@/stores/deals'

  const dealsStore = useDealsStore()

  // Saved IDs minus the deals actually found = favorites we can't display.
  const hiddenCount = computed(() =>
    dealsStore.favorites.length - dealsStore.getFavorites.length,
  )
</script>
