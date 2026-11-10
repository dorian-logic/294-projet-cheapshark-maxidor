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
    <!-- totalFavorites: simple getter of the store (a counter) -->
    <h1 class="text-h4 font-weight-bold mt-6 mb-1">
      Favorites ({{ dealsStore.totalFavorites }})
    </h1>
    <p class="text-medium-emphasis mb-6">
      Deals you marked with the heart, saved in this browser.
    </p>

    <!-- 1. LOADING (direct visit to /favorites: the deals aren't there yet):
         skeleton cards, one per saved favorite (at least 1, at most 8) -->
    <v-row v-if="dealsStore.isLoading">
      <v-col
        v-for="n in Math.min(Math.max(dealsStore.totalFavorites, 1), 8)"
        :key="n"
        cols="12"
        lg="3"
        md="4"
        sm="6"
      >
        <v-skeleton-loader class="rounded-lg" height="320" type="image, article" />
      </v-col>
    </v-row>

    <!-- 2. NO FAVORITES: v-if / v-else on the number of saved IDs -->
    <v-alert
      v-else-if="dealsStore.totalFavorites === 0"
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
        {{ plural(dealsStore.getFavorites.length, 'favorite') }}
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
        {{ plural(hiddenCount, 'favorite') }} can't be shown right now: offline, or no longer on sale.
      </p>
    </template>
  </v-container>
</template>

<script setup>
  import { computed, onMounted } from 'vue'
  import DealCard from '@/components/DealCard.vue'
  import { useDealsStore } from '@/stores/deals'
  import { plural } from '@/utils/format'

  const dealsStore = useDealsStore()

  // Opening this page = the user has seen their new favorites:
  // the badge in the menu goes away.
  onMounted(() => {
    dealsStore.markFavoritesSeen()
  })

  // Saved IDs minus the deals actually found = favorites we can't display.
  const hiddenCount = computed(() =>
    dealsStore.totalFavorites - dealsStore.getFavorites.length,
  )
</script>
