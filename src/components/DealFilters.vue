<!--
  DealFilters.vue

  The filter bar: search, store, max price, minimum discount and sort order.

  Unlike DealCard, this component does NOT use props/emits. Each field is
  bound with v-model directly to `dealsStore.filters` in the Pinia store.

  Data flow:
  user types/clicks -> v-model updates dealsStore.filters.xxx
  -> the `filteredDeals` getter recalculates automatically
  -> the page, which displays `filteredDeals`, re-renders.

  Nobody needs to "call a filter function": Vue's reactivity does it.
-->
<template>
  <v-card border class="pa-4" rounded="lg" variant="flat">
    <v-row dense>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="dealsStore.filters.search"
          clearable
          density="comfortable"
          hide-details
          label="Search a game"
          prepend-inner-icon="mdi-magnify"
        />
      </v-col>

      <v-col cols="12" md="4" sm="6">
        <v-select
          v-model="dealsStore.filters.store"
          clearable
          density="comfortable"
          hide-details
          :items="dealsStore.storeNames"
          label="Store"
          persistent-placeholder
          placeholder="All stores"
          prepend-inner-icon="mdi-storefront-outline"
        />
      </v-col>

      <v-col cols="12" md="4" sm="6">
        <v-select
          v-model="dealsStore.filters.sortBy"
          density="comfortable"
          hide-details
          :items="SORT_OPTIONS"
          label="Sort by"
          prepend-inner-icon="mdi-sort"
        />
      </v-col>

      <v-col cols="12" md="4" sm="6">
        <!-- v-select uses each option's `value` as the stored value
             and its `title` as the visible text. Clearing it sets null. -->
        <v-select
          v-model="dealsStore.filters.maxPrice"
          clearable
          density="comfortable"
          hide-details
          :items="MAX_PRICE_OPTIONS"
          label="Max price"
          persistent-placeholder
          placeholder="Any price"
          prepend-inner-icon="mdi-currency-usd"
        />
      </v-col>

      <v-col class="d-flex align-center" cols="12" md="6" sm="6">
        <v-slider
          v-model="dealsStore.filters.minSavings"
          color="success"
          hide-details
          :label="`Min. discount: ${dealsStore.filters.minSavings}%`"
          :max="100"
          :min="0"
          :step="10"
        />
      </v-col>

      <v-col class="d-flex align-center justify-end" cols="12" md="2">
        <v-btn
          prepend-icon="mdi-filter-remove-outline"
          variant="text"
          @click="dealsStore.resetFilters()"
        >
          Reset
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
  import { MAX_PRICE_OPTIONS, SORT_OPTIONS, useDealsStore } from '@/stores/deals'

  // Calling useDealsStore() gives us the SAME store instance that every other
  // component gets, so changing a filter here is visible everywhere.
  const dealsStore = useDealsStore()
</script>
