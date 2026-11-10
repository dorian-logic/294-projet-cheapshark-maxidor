<!--
  DealFilters.vue

  The filter bar: search, store, max price, minimum discount and sort order.

  Unlike DealCard, this component does NOT use props/emits. Each field is
  bound with v-model directly to `dealsStore.filters` in the Pinia store.

  Data flow:
  user types/clicks -> v-model updates dealsStore.filters.xxx
  -> the chained computed of pages/index.vue (filteredByStore ... sortedDeals)
     recalculate automatically
  -> the page, which displays the result, re-renders.

  Nobody needs to "call a filter function": Vue's reactivity does it.

  The "Reset filters" button is next to the results count (pages/index.vue),
  and only appears when a filter is active.
-->
<template>
  <!-- No border: the panel stands out from the page through its colour alone
       (theme `surface` on top of the darker `background`).
       Fields: density="compact" (less height), variant="solo-filled" (filled
       background, no underline), rounded="lg", flat (no shadow).
       Layout: 1 field per row on phones, 2 on tablets/laptops (md), and
       everything on ONE row on wide screens (lg): 2+2+2+4+2 = 12 columns. -->
  <v-card class="pa-3" rounded="lg" variant="flat">
    <v-row align="center" dense>
      <v-col cols="12" lg="2" md="6">
        <v-text-field
          v-model="dealsStore.filters.search"
          aria-label="Search a game"
          clearable
          density="compact"
          flat
          hide-details
          placeholder="Search a game"
          prepend-inner-icon="mdi-magnify"
          rounded="lg"
          variant="solo-filled"
        />
      </v-col>

      <v-col cols="12" lg="2" md="3" sm="6">
        <v-select
          v-model="dealsStore.filters.store"
          aria-label="Store"
          clearable
          density="compact"
          flat
          hide-details
          :items="dealsStore.storeNames"
          placeholder="All stores"
          prepend-inner-icon="mdi-storefront-outline"
          rounded="lg"
          variant="solo-filled"
        />
      </v-col>

      <v-col cols="12" lg="2" md="3" sm="6">
        <!-- v-select uses each option's `value` as the stored value
             and its `title` as the visible text. Clearing it sets null. -->
        <v-select
          v-model="dealsStore.filters.maxPrice"
          aria-label="Max price"
          clearable
          density="compact"
          flat
          hide-details
          :items="MAX_PRICE_OPTIONS"
          placeholder="Any price"
          prepend-inner-icon="mdi-currency-usd"
          rounded="lg"
          variant="solo-filled"
        />
      </v-col>

      <v-col
        class="d-flex align-center ga-2"
        cols="12"
        lg="4"
        md="6"
        sm="6"
      >
        <!-- SORT CRITERION. Instead of v-model, we read the value with
             :model-value and handle changes ourselves with
             @update:model-value: picking a criterion also resets the
             direction to the one that makes sense for it (setSortBy). -->
        <v-select
          aria-label="Sort by"
          density="compact"
          flat
          hide-details
          :items="SORT_OPTIONS"
          :model-value="dealsStore.filters.sortBy"
          prepend-inner-icon="mdi-sort"
          rounded="lg"
          variant="solo-filled"
          @update:model-value="dealsStore.setSortBy"
        />
        <!-- SORT DIRECTION toggle button: ascending <-> descending.
             Its text says what the CURRENT order means for the chosen
             criterion ("Cheapest first", "A → Z"...). -->
        <v-btn
          :aria-label="`Sort order: ${sortLabel}. Click to reverse.`"
          class="flex-shrink-0"
          height="40"
          prepend-icon="mdi-swap-vertical"
          rounded="lg"
          title="Reverse the order"
          variant="tonal"
          @click="dealsStore.toggleSortOrder()"
        >
          {{ sortLabel }}
        </v-btn>
      </v-col>

      <v-col cols="12" lg="2" md="6" sm="6">
        <!-- Small label above the slider. At 0 % the filter does nothing,
             so "Any" is clearer than "0%". -->
        <div class="text-caption text-medium-emphasis px-1">
          Min. discount: {{ dealsStore.filters.minSavings === 0 ? 'Any' : `${dealsStore.filters.minSavings}%` }}
        </div>
        <v-slider
          v-model="dealsStore.filters.minSavings"
          aria-label="Minimum discount"
          color="success"
          density="compact"
          hide-details
          :max="100"
          :min="0"
          :step="10"
        />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
  import { computed } from 'vue'
  import { MAX_PRICE_OPTIONS, SORT_OPTIONS, useDealsStore } from '@/stores/deals'

  // Calling useDealsStore() gives us the SAME store instance that every other
  // component gets, so changing a filter here is visible everywhere.
  const dealsStore = useDealsStore()

  // Text of the toggle button: the label of the chosen criterion for the
  // current direction, e.g. Price + 'asc' -> "Cheapest first".
  const sortLabel = computed(() => {
    const option = SORT_OPTIONS.find(o => o.value === dealsStore.filters.sortBy) ?? SORT_OPTIONS[0]
    return option.labels[dealsStore.filters.sortOrder]
  })
</script>
