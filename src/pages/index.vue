<!--
  pages/index.vue

  The home page (the only page of the app, shown at "/").

  Its job is to "assemble" the screen:
  - ask the store to load the deals when the page appears
  - show the filter bar
  - show the right state: loading, error, no results, or the list
  - split the (possibly long) list into pages of DEALS_PER_PAGE cards
  - open the detail dialog when a card is clicked

  The filtering and sorting logic is NOT here: it lives in the store
  (getter `filteredDeals`). The page only displays the result.
-->
<template>
  <v-container>
    <h1 class="text-h4 font-weight-bold my-4">
      Game deals
    </h1>

    <DealFilters class="mb-6" />

    <!-- OFFLINE WARNING: the API failed and we are showing the saved sample
         data. It sits ABOVE the list (the list is still shown below it). -->
    <v-alert
      v-if="dealsStore.usingFallback && !dealsStore.loading"
      class="mb-6"
      title="Showing saved sample deals"
      type="warning"
      variant="tonal"
    >
      {{ dealsStore.error }}
      These deals were saved on {{ formatDate(dealsStore.fallbackSavedAt) }}
      and may be out of date.
      <template #append>
        <v-btn variant="outlined" @click="dealsStore.loadDeals()">
          Retry
        </v-btn>
      </template>
    </v-alert>

    <!-- 1. LOADING: shown while the API download is in progress -->
    <div v-if="dealsStore.loading" class="text-center py-12">
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
        <v-btn variant="outlined" @click="dealsStore.loadDeals()">
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
          <!-- @select: DealCard emits the clicked deal, we remember it -->
          <DealCard
            :deal="deal"
            :store-logo="dealsStore.storeLogo(deal.store)"
            @select="selectedDeal = $event"
          />
        </v-col>
      </v-row>

      <v-pagination
        v-if="pageCount > 1"
        v-model="currentPage"
        class="my-6"
        :length="pageCount"
        :total-visible="7"
      />
    </template>

    <!-- DETAIL VIEW: open when selectedDeal is not null -->
    <DealDetailDialog
      :deal="selectedDeal"
      :store-logo="selectedDeal ? dealsStore.storeLogo(selectedDeal.store) : ''"
      @close="selectedDeal = null"
      @show-store="showStore"
    />
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useDealsStore } from '@/stores/deals'
  import { formatDate } from '@/utils/format'

  const dealsStore = useDealsStore()

  // How many cards are shown per page of results.
  const DEALS_PER_PAGE = 24

  // Page of results currently shown. This is purely visual (UI) state that
  // only this page cares about, so it stays here and not in the store.
  const currentPage = ref(1)

  // The deal shown in the detail dialog, or null = dialog closed.
  // Also UI state of this page only, so it lives here too.
  const selectedDeal = ref(null)

  // Number of pages: 50 deals / 24 per page -> 2.08 -> rounded UP to 3.
  const pageCount = computed(() =>
    Math.ceil(dealsStore.filteredDeals.length / DEALS_PER_PAGE),
  )

  // Only the deals of the current page.
  // Page 1 -> items 0 to 23, page 2 -> items 24 to 47, etc.
  // slice(start, end) returns a copy and does not include `end`.
  const visibleDeals = computed(() => {
    const start = (currentPage.value - 1) * DEALS_PER_PAGE
    return dealsStore.filteredDeals.slice(start, start + DEALS_PER_PAGE)
  })

  // When ANY filter changes, go back to page 1. Otherwise a user on page 5
  // who searches for a game with only 3 results would see an empty page.
  // `deep: true` = also react to changes INSIDE the filters object.
  watch(
    () => dealsStore.filters,
    () => {
      currentPage.value = 1
    },
    { deep: true },
  )

  // "All deals from <store>" in the dialog: set the store filter (the list
  // updates by itself through the store's getter), then close the dialog
  // and scroll back to the top so the user sees the new results.
  function showStore (storeName) {
    dealsStore.filters.store = storeName
    selectedDeal.value = null
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // onMounted runs once, when the page is displayed for the first time.
  onMounted(() => {
    dealsStore.loadDeals()
  })
</script>
