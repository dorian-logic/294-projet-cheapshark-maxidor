<!--
  DealCard.vue

  Displays ONE deal as a card: image, title, store, prices and scores.

  This is a "presentational" component: it does not fetch or change any
  data. It receives a deal through its props and shows it. When the user
  clicks it, it doesn't decide what happens: it only EMITS a `select` event
  and lets the parent decide (here: the page opens the detail dialog).

  Usage: <DealCard :deal="deal" :store-logo="url" @select="openDetail" />
  (Components in src/components are auto-imported, no `import` needed.)
-->
<template>
  <!-- @click makes the card clickable with the mouse (hover effect, ripple).
       Vuetify does NOT make it usable with the keyboard, so we add it ourselves:
       - tabindex="0"   -> the card can be reached with the Tab key
       - role="button"  -> screen readers announce it as a button
       - Enter / Space  -> open the details, like a real button
         (.prevent stops Space from also scrolling the page) -->
  <v-card
    :aria-label="`Show details for ${deal.title}`"
    class="h-100 d-flex flex-column"
    role="button"
    tabindex="0"
    @click="emit('select', deal)"
    @keydown.enter="emit('select', deal)"
    @keydown.space.prevent="emit('select', deal)"
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

  // Emits = the events this component can SEND to its parent.
  // Data goes down through props, events go up through emits.
  const emit = defineEmits(['select'])

  // `computed` values are recalculated only when the props they use change.
  const imageUrl = computed(() => toImageUrl(props.deal.image))
</script>
