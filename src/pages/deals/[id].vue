<!--
  pages/deals/[id].vue

  The DETAIL PAGE of one deal, at the address /deals/<id> (e.g. /deals/12).

  How does this file become a route? The project uses file-based routing
  (unplugin-vue-router): every file in src/pages/ becomes a page.
  - pages/index.vue       -> /
  - pages/deals/[id].vue  -> /deals/:id
  The [brackets] in the file name mean "dynamic part": whatever is written
  there in the URL is given to the page as `route.params.id`.

  The page must work in TWO situations:
  1. The user clicked a card in the list: the deals are already in the store,
     so the deal is found instantly.
  2. The user opened /deals/12 directly (bookmark, shared link, refresh F5):
     the app has just started and the store is EMPTY. App.vue's init() is
     downloading the deals: the page shows a spinner, and displays the deal as
     soon as the data arrives (the `deal` computed recalculates by itself).
-->
<template>
  <v-container class="py-6" style="max-width: 1000px">
    <v-btn
      class="mb-4"
      prepend-icon="mdi-arrow-left"
      variant="text"
      @click="goBack"
    >
      Back to deals
    </v-btn>

    <!-- 1. LOADING (direct visit: the data isn't there yet) -->
    <div v-if="dealsStore.isLoading" class="text-center py-12">
      <v-progress-circular color="primary" indeterminate size="48" />
      <p class="mt-4 text-medium-emphasis">
        Loading deal...
      </p>
    </div>

    <!-- 2a. OFFLINE: the API is down and this deal isn't one of the saved
         sample deals. It probably exists; we just can't load it right now. -->
    <v-alert
      v-else-if="!deal && dealsStore.usingFallback"
      title="Deal unavailable offline"
      type="warning"
      variant="tonal"
    >
      {{ dealsStore.error }}
      This deal is not part of the saved sample deals.
      <template #append>
        <v-btn variant="outlined" @click="dealsStore.fetchDeals()">
          Retry
        </v-btn>
      </template>
    </v-alert>

    <!-- 2b. NOT FOUND: the data is loaded but no deal has this id
         (e.g. /deals/99999 or /deals/abc) -->
    <v-alert
      v-else-if="!deal"
      title="Deal not found"
      type="warning"
      variant="tonal"
    >
      There is no deal with the id "{{ route.params.id }}". It may have been
      removed, or the address is wrong.
      <template #append>
        <v-btn to="/" variant="outlined">
          See all deals
        </v-btn>
      </template>
    </v-alert>

    <!-- 3. THE DEAL (with a small reminder if it comes from the sample data) -->
    <v-alert
      v-if="deal && dealsStore.usingFallback && !dealsStore.isLoading"
      class="mb-4"
      density="compact"
      text="Offline: showing saved sample data, prices may be out of date."
      type="warning"
      variant="tonal"
    />
    <v-card
      v-if="deal && !dealsStore.isLoading"
      border
      rounded="lg"
      variant="flat"
    >
      <v-row no-gutters>
        <!-- Left column (full width on phones): the image -->
        <v-col cols="12" md="5">
          <v-img
            :alt="deal.title"
            class="fill-height"
            cover
            min-height="220"
            :src="toImageUrl(deal.image)"
          >
            <template #error>
              <div class="d-flex align-center justify-center fill-height bg-grey-lighten-2">
                <v-icon color="grey" icon="mdi-gamepad-variant-outline" size="64" />
              </div>
            </template>
          </v-img>
        </v-col>

        <!-- Right column: all the information -->
        <v-col cols="12" md="7">
          <!-- h1: the main title of the page (good for accessibility and SEO) -->
          <h1 class="text-h5 font-weight-bold px-4 pt-4 pb-1">
            {{ deal.title }}
          </h1>

          <v-card-subtitle class="d-flex align-center ga-2">
            <v-avatar v-if="storeLogo" rounded="0" size="20">
              <v-img :alt="deal.store" :src="storeLogo" />
            </v-avatar>
            {{ deal.store }}
          </v-card-subtitle>

          <v-card-text>
            <!-- PRICE BLOCK -->
            <div class="d-flex align-baseline flex-wrap ga-3 mb-1">
              <span class="text-h4 font-weight-bold text-success">
                {{ formatSalePrice(deal.salePrice) }}
              </span>
              <span class="text-h6 text-medium-emphasis text-decoration-line-through">
                {{ formatPrice(deal.normalPrice) }}
              </span>
              <v-chip color="success" variant="flat">
                -{{ Math.round(deal.savings ?? 0) }}%
              </v-chip>
            </div>
            <p class="text-body-1 mb-4">
              You save <strong>{{ formatPrice(amountSaved) }}</strong>.
            </p>

            <!-- RATINGS: each line shows "Not available" when the API has no value -->
            <v-list density="compact" lines="two">
              <v-list-item prepend-icon="mdi-star" title="Metacritic score">
                <v-list-item-subtitle v-if="deal.metacriticScore">
                  {{ deal.metacriticScore }} / 100
                  <v-progress-linear
                    class="mt-1"
                    :color="scoreColor(deal.metacriticScore)"
                    :model-value="deal.metacriticScore"
                    rounded
                  />
                </v-list-item-subtitle>
                <v-list-item-subtitle v-else>
                  Not available
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item prepend-icon="mdi-steam" title="Steam reviews">
                <v-list-item-subtitle v-if="deal.steamRatingPercent">
                  {{ deal.steamRatingPercent }}% positive — {{ deal.steamRatingText }}
                  <v-progress-linear
                    class="mt-1"
                    :color="scoreColor(deal.steamRatingPercent)"
                    :model-value="deal.steamRatingPercent"
                    rounded
                  />
                </v-list-item-subtitle>
                <v-list-item-subtitle v-else>
                  Not available
                </v-list-item-subtitle>
              </v-list-item>

              <!-- CheapShark's own grade (0-10) mixing the discount and the game's reviews -->
              <v-list-item prepend-icon="mdi-tag-check" title="Deal rating (CheapShark)">
                <v-list-item-subtitle>
                  {{ deal.dealRating ?? '—' }} / 10
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item prepend-icon="mdi-calendar" title="Release date">
                <v-list-item-subtitle>
                  {{ formatDate(deal.releaseDate) || 'Not available' }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>

          <v-card-actions class="flex-wrap ga-2">
            <!-- Same toggle as the heart on the cards: the icon, colour and
                 text all depend on isFavorite(), so they switch by themselves -->
            <v-btn
              :color="dealsStore.isFavorite(deal.id) ? 'red' : undefined"
              :prepend-icon="dealsStore.isFavorite(deal.id) ? 'mdi-heart' : 'mdi-heart-outline'"
              variant="tonal"
              @click="dealsStore.toggleFavorite(deal.id)"
            >
              {{ dealsStore.isFavorite(deal.id) ? 'In favorites' : 'Add to favorites' }}
            </v-btn>
            <v-btn
              prepend-icon="mdi-storefront-outline"
              variant="tonal"
              @click="showStore"
            >
              All deals from {{ deal.store }}
            </v-btn>
          </v-card-actions>
        </v-col>
      </v-row>
    </v-card>
  </v-container>
</template>

<script setup>
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { toImageUrl } from '@/plugins/axios'
  import { useDealsStore } from '@/stores/deals'
  import { formatDate, formatPrice, formatSalePrice } from '@/utils/format'

  // useRoute()  = information about the CURRENT address (params, query...).
  // useRouter() = the router itself, to navigate (push, back...).
  const route = useRoute()
  const router = useRouter()
  const dealsStore = useDealsStore()

  // The URL gives the id as TEXT ("12"), but the ids in the data are NUMBERS
  // (12), and 12 === "12" is false. So we convert it with Number().
  // "abc" becomes NaN, which matches no deal -> "Deal not found".
  const dealId = computed(() => Number(route.params.id))

  // The deal to display. `computed` makes it update automatically:
  // - when the deals finish loading (direct visit), or
  // - if the id in the URL changes.
  const deal = computed(() => dealsStore.getDealById(dealId.value))

  const storeLogo = computed(() =>
    deal.value ? dealsStore.storeLogo(deal.value.store) : '',
  )

  // Money saved = normal price - sale price. The API only gives the
  // percentage, so we calculate the amount ourselves.
  const amountSaved = computed(() =>
    (deal.value?.normalPrice ?? 0) - (deal.value?.salePrice ?? 0),
  )

  // Colour of a score bar: green = good, orange = average, red = bad.
  function scoreColor (score) {
    if (score >= 75) {
      return 'success'
    }
    if (score >= 50) {
      return 'warning'
    }
    return 'error'
  }

  // "Back to deals":
  // - If the user came from the list, go BACK in the browser history, exactly
  //   like the browser's Back button: the list keeps its scroll position.
  // - If they opened this page directly (no previous page in the app),
  //   there is nothing to go back to, so we navigate to the list instead.
  // Vue Router saves the previous address in `window.history.state.back`.
  function goBack () {
    if (window.history.state?.back) {
      router.back()
    } else {
      router.push('/')
    }
  }

  // "All deals from <store>": set the store filter, then go to the list.
  function showStore () {
    dealsStore.filterByStore(deal.value.store)
    router.push('/')
  }

  // No onMounted / fetchDeals() here: the deals are loaded once for the whole
  // app by dealsStore.init() in App.vue, even on a direct visit to this page.
</script>
