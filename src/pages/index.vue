<!--
  pages/index.vue

  The home page, shown at "/": the list of deals.

  Its job:
  - show the filter bar (DealFilters writes the filters into the store)
  - turn the store's deals into the list to display, with CHAINED computed:
      deals -> filteredByStore -> filteredByPrice -> filteredByDiscount
            -> filteredBySearch -> sortedDeals -> visibleDeals (current page)
  - show the right state: loading (skeletons), error, no results, or the list
  (Clicking a card opens /deals/<id>: see DealCard.vue and pages/deals/[id].vue.)

  The deals themselves are loaded once for the whole app by dealsStore.init()
  in App.vue, so there is no fetch / onMounted here.
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
      v-if="usingFallback && !isLoading"
      class="mb-6"
      title="Showing saved sample deals"
      type="warning"
      variant="tonal"
    >
      {{ error }}
      These deals were saved on {{ formatDate(dealsStore.fallbackSavedAt) }}
      and may be out of date.
      <template #append>
        <v-btn variant="outlined" @click="dealsStore.fetchDeals()">
          Retry
        </v-btn>
      </template>
    </v-alert>

    <!-- 1. LOADING: skeleton cards (grey placeholder shapes) while the API
         download is in progress, laid out like the real grid, so the page
         doesn't "jump" when the cards arrive. -->
    <v-row v-if="isLoading">
      <v-col
        v-for="n in 8"
        :key="n"
        cols="12"
        lg="3"
        md="4"
        sm="6"
      >
        <v-skeleton-loader class="rounded-lg" height="320" type="image, article" />
      </v-col>
    </v-row>

    <!-- 2. ERROR WITHOUT ANY DATA: should not happen thanks to the fallback,
         but the page stays safe if the fallback file were ever empty. -->
    <v-alert
      v-else-if="error && deals.length === 0"
      title="Could not load the deals"
      type="error"
      variant="tonal"
    >
      {{ error }}
      <template #append>
        <v-btn variant="outlined" @click="dealsStore.fetchDeals()">
          Retry
        </v-btn>
      </template>
    </v-alert>

    <!-- 3. NO RESULTS: data is loaded, but no deal matches the filters -->
    <v-alert
      v-else-if="sortedDeals.length === 0"
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
      <!-- Results count + "Reset filters" (only when a filter is active) -->
      <div class="d-flex align-center flex-wrap ga-2 mb-4">
        <span class="text-medium-emphasis">
          {{ plural(sortedDeals.length, 'deal') }}
          <template v-if="sortedDeals.length !== dealsStore.totalDeals">
            of {{ dealsStore.totalDeals }}
          </template>
        </span>
        <v-btn
          v-if="dealsStore.hasActiveFilters"
          density="comfortable"
          prepend-icon="mdi-filter-remove-outline"
          size="small"
          variant="text"
          @click="dealsStore.resetFilters()"
        >
          Reset filters
        </v-btn>
      </div>

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
        v-model="currentPage"
        class="my-6"
        :length="pageCount"
        :total-visible="7"
      />
    </template>
  </v-container>
</template>

<script setup>
  import { storeToRefs } from 'pinia'
  import { computed, watch } from 'vue'
  import DealCard from '@/components/DealCard.vue'
  import DealFilters from '@/components/DealFilters.vue'
  import { SORT_OPTIONS, useDealsStore } from '@/stores/deals'
  import { formatDate, plural } from '@/utils/format'

  const dealsStore = useDealsStore()

  // storeToRefs() turns the store's STATE into refs we can destructure
  // without losing reactivity: `deals` stays linked to dealsStore.deals.
  // (A plain `const { deals } = dealsStore` would copy the value once and
  // never update.) Actions are NOT taken this way: we call them on dealsStore.
  // `currentPage` and `filters` live in the store so they survive navigation
  // (open a deal, press Back: same filters, same page).
  const { deals, isLoading, error, usingFallback, filters, currentPage } = storeToRefs(dealsStore)

  // How many cards are shown per page of results.
  const DEALS_PER_PAGE = 24

  // ---------------------------------------------------------------------------
  // CHAINED COMPUTED: each step takes the result of the previous one.
  // A computed is recalculated automatically when the data it reads changes
  // (a filter, or the deals), and its result is cached otherwise.
  // filter() and toSorted() return NEW arrays: the store's `deals` array is
  // never modified, it stays the untouched source.
  // ---------------------------------------------------------------------------

  // 1. Store filter (v-select). null = all stores.
  const filteredByStore = computed(() => {
    if (!filters.value.store) {
      return deals.value
    }
    return deals.value.filter(deal => deal.store === filters.value.store)
  })

  // 2. Maximum price (v-select). null = no limit.
  const filteredByPrice = computed(() => {
    if (filters.value.maxPrice === null) {
      return filteredByStore.value
    }
    return filteredByStore.value.filter(deal => deal.salePrice <= filters.value.maxPrice)
  })

  // 3. Minimum discount (slider). 0 = no minimum.
  const filteredByDiscount = computed(() => {
    if (filters.value.minSavings === 0) {
      return filteredByPrice.value
    }
    return filteredByPrice.value.filter(deal => (deal.savings ?? 0) >= filters.value.minSavings)
  })

  // 4. Search by name (v-text-field). Case-insensitive: both the title and
  //    the search text are lowercased before comparing.
  const filteredBySearch = computed(() => {
    const query = (filters.value.search ?? '').trim().toLowerCase()
    if (!query) {
      return filteredByDiscount.value
    }
    return filteredByDiscount.value.filter(deal => deal.title.toLowerCase().includes(query))
  })

  // 5. Sort, by the chosen criterion, ascending or descending (toggle button).
  //    The compare function returns < 0 (a first), > 0 (b first) or 0.
  //    For 'desc' we multiply by -1, which reverses the order.
  const sortedDeals = computed(() => {
    const option = SORT_OPTIONS.find(o => o.value === filters.value.sortBy) ?? SORT_OPTIONS[0]
    const direction = filters.value.sortOrder === 'asc' ? 1 : -1

    return filteredBySearch.value.toSorted((a, b) => {
      const valueA = option.getValue(a)
      const valueB = option.getValue(b)
      // Some deals have no score or no date: they always go to the END,
      // whatever the direction.
      if (valueA === undefined || valueB === undefined) {
        if (valueA === valueB) {
          return 0
        }
        return valueA === undefined ? 1 : -1
      }
      // Text (name, date "YYYY-MM-DD") -> localeCompare; numbers -> subtraction.
      const comparison = typeof valueA === 'string'
        ? valueA.localeCompare(valueB, 'en')
        : valueA - valueB
      return direction * comparison
    })
  })

  // 6. Pagination: only the deals of the current page.
  //    Number of pages: 50 deals / 24 per page -> 2.08 -> rounded UP to 3.
  const pageCount = computed(() => Math.ceil(sortedDeals.value.length / DEALS_PER_PAGE))

  //    Page 1 -> items 0 to 23, page 2 -> items 24 to 47, etc.
  //    slice(start, end) returns a copy and does not include `end`.
  const visibleDeals = computed(() => {
    const start = (currentPage.value - 1) * DEALS_PER_PAGE
    return sortedDeals.value.slice(start, start + DEALS_PER_PAGE)
  })

  // When ANY filter or the sort changes, go back to page 1. Otherwise a user
  // on page 5 who searches for a game with only 3 results would see an empty
  // page. `deep: true` = also react to changes INSIDE the filters object.
  watch(
    filters,
    () => {
      currentPage.value = 1
    },
    { deep: true },
  )
</script>
