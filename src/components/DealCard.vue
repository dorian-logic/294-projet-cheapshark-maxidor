<!--
  DealCard.vue

  Displays ONE deal as a card: image, title, store, prices and scores.
  Clicking the card opens the deal's detail page (/deals/<id>).

  This is a "presentational" component: it does not fetch or change any
  data. It receives a deal through its props and shows it.

  Usage: <DealCard :deal="deal" :store-logo="url" />
  (Components in src/components are auto-imported, no `import` needed.)
-->
<template>
  <!-- `to` turns the card into a router LINK (an <a> element):
       - clicking it navigates to /deals/<id> without reloading the page
       - it works with the keyboard (Tab, then Enter), like any link
       - Ctrl+click / middle-click opens the deal in a new tab
       - the browser's Back button returns to the list -->
  <v-card
    class="h-100 d-flex flex-column"
    :to="`/deals/${deal.id}`"
  >
    <v-img
      :alt="deal.title"
      cover
      height="140"
      :src="imageUrl"
    >
      <!-- Discount badge in the top-right corner of the image -->
      <v-chip
        class="ma-2 position-absolute right-0 font-weight-bold"
        color="success"
        size="small"
        variant="elevated"
      >
        -{{ Math.round(deal.savings ?? 0) }}%
      </v-chip>

      <!-- Shown instead of the picture if it can't be loaded
           (e.g. offline, or the image doesn't exist) -->
      <template #error>
        <div class="d-flex align-center justify-center fill-height bg-grey-lighten-2">
          <v-icon color="grey" icon="mdi-gamepad-variant-outline" size="48" />
        </div>
      </template>
    </v-img>

    <v-card-title class="text-wrap text-subtitle-1 font-weight-bold">
      {{ deal.title }}
    </v-card-title>

    <v-card-subtitle class="d-flex align-center ga-2">
      <!-- Only render the logo if we found one for this store -->
      <v-avatar
        v-if="storeLogo"
        rounded="0"
        size="16"
      >
        <v-img :alt="deal.store" :src="storeLogo" />
      </v-avatar>
      {{ deal.store }}
    </v-card-subtitle>

    <v-card-text class="flex-grow-1">
      <!-- Prices: old price crossed out, new price big -->
      <div class="d-flex align-baseline ga-2 mb-2">
        <span class="text-h6 font-weight-bold text-success">
          {{ formatSalePrice(deal.salePrice) }}
        </span>
        <span class="text-medium-emphasis text-decoration-line-through">
          {{ formatPrice(deal.normalPrice) }}
        </span>
      </div>

      <!-- Scores: shown only when the API provides them -->
      <div class="d-flex flex-wrap ga-1">
        <v-chip
          v-if="deal.metacriticScore"
          prepend-icon="mdi-star"
          size="x-small"
        >
          Metacritic {{ deal.metacriticScore }}
        </v-chip>
        <v-chip
          v-if="deal.steamRatingPercent"
          prepend-icon="mdi-steam"
          size="x-small"
          :title="deal.steamRatingText"
        >
          Steam {{ deal.steamRatingPercent }}%
        </v-chip>
        <v-chip
          v-if="deal.releaseDate"
          prepend-icon="mdi-calendar"
          size="x-small"
        >
          {{ formatYear(deal.releaseDate) }}
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
  import { computed } from 'vue'
  import { toImageUrl } from '@/services/api'
  import { formatPrice, formatSalePrice, formatYear } from '@/utils/format'

  // Props = the data the PARENT gives to this component.
  // Declaring the type and `required` makes Vue warn us in the console
  // if the parent forgets a prop or passes the wrong type.
  const props = defineProps({
    deal: {
      type: Object,
      required: true,
    },
    storeLogo: {
      type: String,
      default: '',
    },
  })

  // `computed` values are recalculated only when the props they use change.
  const imageUrl = computed(() => toImageUrl(props.deal.image))
</script>
