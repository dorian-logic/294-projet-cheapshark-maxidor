<!--
  DealCard.vue

  Displays ONE deal as a card: image, title, store, prices and scores.

  This is a "presentational" component: it does not fetch or change any
  data. It only receives a deal through its props and shows it. That makes
  it reusable (any list of deals can use it) and easy to understand.

  Usage: <DealCard :deal="deal" :store-logo="url" />
  (Components in src/components are auto-imported, no `import` needed.)
-->
<template>
  <v-card class="h-100 d-flex flex-column">
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
          {{ salePriceLabel }}
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
          v-if="releaseYear"
          prepend-icon="mdi-calendar"
          size="x-small"
        >
          {{ releaseYear }}
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
  import { computed } from 'vue'
  import { toImageUrl } from '@/services/api'

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

  // Formats a number as US dollars: 4.99 -> "$4.99".
  // The API prices are in USD, so we always use the USD currency.
  const priceFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  function formatPrice (price) {
    return priceFormatter.format(price ?? 0)
  }

  // `computed` values are recalculated only when the props they use change.
  const imageUrl = computed(() => toImageUrl(props.deal.image))

  const salePriceLabel = computed(() =>
    props.deal.salePrice === 0 ? 'FREE' : formatPrice(props.deal.salePrice),
  )

  // "2016-08-30" -> "2016". Returns '' when the date is missing.
  const releaseYear = computed(() => props.deal.releaseDate?.slice(0, 4) ?? '')
</script>
