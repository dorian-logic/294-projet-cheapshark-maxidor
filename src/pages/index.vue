<!--
  pages/index.vue

  The home page (the only page of the app, shown at "/").

  Its job is to "assemble" the screen:
  - ask the store to load the deals when the page appears
  - show the filter bar
  - show the right state: loading, error, no results, or the list
  - split the (possibly long) list into pages of DEALS_PER_PAGE cards
  (Clicking a card opens /deals/<id>: see DealCard.vue and pages/deals/[id].vue.)

  The filtering and sorting logic is NOT here: it lives in the store
  (getter `filteredDeals`). The page only displays the result.
-->
<template>
  <v-container>
    <h1 class="text-h4 font-weight-bold mt-6 mb-1">
      Game deals
    </h1>
    <p class="text-medium-emphasis mb-6">
      Discounted PC games from Steam, GOG, Epic and more, filtered your way.
    </p>

    <DealFilters class="mb-6" />

    <!-- OFFLINE WARNING: the API failed and we are showing the saved sample
         data. It sits ABOVE the list (the list is still shown below it). -->
    <v-alert
      v-if="dealsStore.usingFallback && !dealsStore.isLoading"
      class="mb-6"
      title="Showing saved sample deals"
      type="warning"
      variant="tonal"
    >
      {{ dealsStore.error }}
      These deals were saved on {{ formatDate(dealsStore.fallbackSavedAt) }}
      and may be out of date.
      <template #append>
        <v-btn variant="outlined" @click="dealsStore.fetchDeals()">
          Retry
        </v-btn>
      </template>
    </v-alert>

    <!-- 1. LOADING: shown while the API download is in progress -->
    <div v-if="dealsStore.isLoading" class="text-center py-12">
      <v-progress-circular color="primary" indeterminate size="48" />
      <p class="mt-4 text-medium-emphasis">
        Loading deals...
      </p>
    </div>

    <!-- 2. ERROR WITHOUT ANY DATA: should not happen thanks to the fallback,
         but the page stays safe if the fallback file were ever empty. -->
    <v-alert
      v-else-if="dealsStore.error && dealsStore.deals.length === 0"
      title="Could not load the deals"
      type="error"
      variant="tonal"
    >
      {{ dealsStore.error }}
      <template #append>
        <v-btn variant="outlined" @click="dealsStore.fetchDeals()">
          Retry
        </v-btn>
      </template>
    </v-alert>

    <!-- 3. NO RESULTS: data is loaded, but no deal matches the filters -->
    <v-alert
      v-else-if="dealsStore.filteredDeals.length === 0"
      title="No deal found"
      type="info"
      variant="tonal"
    >
      No deal matches your filters.
      <template #append>
        <v-btn variant="outlined" @click="dealsStore.resetFilters()">
          Reset filters
        </v-btn>
      </template>
    </v-alert>

    <!-- 4. RESULTS -->
    <template v-else>
      <p class="mb-4 text-medium-emphasis">
        {{ dealsStore.filteredDeals.length }} deal(s) found — click a deal for details
      </p>

      <!-- Responsive grid: 1 card per row on phones, 2 on tablets,
           3 on laptops, 4 on large screens (12 columns / cols value) -->
      <v-row>
        <v-col
          v-for="deal in visibleDeals"
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

      <v-pagination
        v-if="pageCount > 1"
        v-model="dealsStore.currentPage"
        class="my-6"
        :length="pageCount"
        :total-visible="7"
      />
    </template>
  </v-container>
</template>

<script setup>
  import { computed, watch } from 'vue'
  import { useDealsStore } from '@/stores/deals'
  import { formatDate } from '@/utils/format'

  const dealsStore = useDealsStore()

  // How many cards are shown per page of results.
  const DEALS_PER_PAGE = 24

  // The current page of results is `dealsStore.currentPage`. It's in the
  // store, not here: this component is destroyed when the user opens a deal,
  // and a local variable would be lost (back to page 1 on every return).

  // Number of pages: 50 deals / 24 per page -> 2.08 -> rounded UP to 3.
  const pageCount = computed(() =>
    Math.ceil(dealsStore.filteredDeals.length / DEALS_PER_PAGE),
  )

  // Only the deals of the current page.
  // Page 1 -> items 0 to 23, page 2 -> items 24 to 47, etc.
  // slice(start, end) returns a copy and does not include `end`.
  const visibleDeals = computed(() => {
    const start = (dealsStore.currentPage - 1) * DEALS_PER_PAGE
    return dealsStore.filteredDeals.slice(start, start + DEALS_PER_PAGE)
  })

  // When ANY filter changes, go back to page 1. Otherwise a user on page 5
  // who searches for a game with only 3 results would see an empty page.
  // `deep: true` = also react to changes INSIDE the filters object.
  watch(
    () => dealsStore.filters,
    () => {
      dealsStore.currentPage = 1
    },
    { deep: true },
  )

  // No onMounted / fetchDeals() here: the deals are loaded once for the whole
  // app by dealsStore.init(), called in App.vue.
</script>
