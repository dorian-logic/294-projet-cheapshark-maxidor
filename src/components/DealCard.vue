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
  <!-- Style: `variant="flat"` removes the default shadow, `border` adds a thin
       border in the theme's colour, `rounded="lg"` rounds the corners.
       The hover effect is in the <style> block at the bottom. -->
  <v-card
    border
    class="deal-card h-100 d-flex flex-column"
    rounded="lg"
    :to="`/deals/${deal.id}`"
    variant="flat"
  >
    <v-img
      :alt="deal.title"
      class="deal-card__image"
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

    <!-- :title shows the full name on hover when it's cut after 2 lines -->
    <v-card-title class="deal-card__title text-wrap text-subtitle-1 font-weight-bold" :title="deal.title">
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
  import { toImageUrl } from '@/plugins/axios'
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

<!--
  `scoped`: these CSS rules only apply to THIS component's elements.
  Vue adds a unique attribute (e.g. data-v-3f2a1c) to the component's HTML
  and to each selector, so `.deal-card` here can't clash with another
  `.deal-card` elsewhere in the app.
-->
<style scoped>
  .deal-card {
    /* Animate these two properties instead of changing them instantly */
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  /* On hover: the card rises a little and gets a soft shadow */
  .deal-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  }

  /* In a flex column, children may shrink when space is tight. Without this,
     a card with a 2-line title got a smaller image than its neighbours. */
  .deal-card__image {
    flex-shrink: 0;
  }

  /* :deep() reaches INSIDE the v-img component: its <img> element is
     created by Vuetify, so it doesn't get our scoped attribute and a
     normal scoped selector couldn't target it. */
  .deal-card__image :deep(.v-img__img) {
    transition: transform 0.4s ease;
  }

  .deal-card:hover .deal-card__image :deep(.v-img__img) {
    transform: scale(1.05);
  }

  /* Titles: at most 2 lines, then "...", and always the height of 2 lines,
     so the prices line up on every card of a row. */
  .deal-card__title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    line-height: 1.4;
    min-height: calc(2 * 1.4em + 1rem); /* 2 lines + the title's padding */
  }

  /* Users who asked their system for less motion get no animation */
  @media (prefers-reduced-motion: reduce) {
    .deal-card,
    .deal-card__image :deep(.v-img__img) {
      transition: none;
    }

    .deal-card:hover,
    .deal-card:hover .deal-card__image :deep(.v-img__img) {
      transform: none;
    }
  }
</style>
