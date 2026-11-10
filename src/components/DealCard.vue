<!--
  DealCard.vue

  Displays ONE deal as a card: image, store, title, price and scores.
  Clicking the card opens the deal's detail page (/deals/<id>).

  It receives the deal to show through its props. The only thing it changes
  is the favorites (heart button), through the store, so the heart works the
  same wherever the card is used (deal list AND favorites page).

  Layout, from top to bottom:
    image (heart top-left, discount top-right)
    store   <- small grey label
    title   <- max 2 lines
    ...     <- empty space grows here (mt-auto), so that:
    price + scores are always at the bottom, aligned across a row of cards

  Usage: <DealCard :deal="deal" :store-logo="url" />
  (Components in src/components are auto-imported, no `import` needed.)
-->
<template>
  <!-- `to` turns the card into a router LINK (an <a> element):
       - clicking it navigates to /deals/<id> without reloading the page
       - it works with the keyboard (Tab, then Enter), like any link
       - Ctrl+click / middle-click opens the deal in a new tab
       - the browser's Back button returns to the list
       Style: `variant="flat"` = no shadow, `border` = thin border in the
       theme's colour, `rounded="lg"` = rounded corners. -->
  <v-card
    border
    class="deal-card h-100 d-flex flex-column"
    rounded="lg"
    :to="`/deals/${deal.id}`"
    variant="flat"
  >
    <!-- aspect-ratio: every image gets the same proportions (460 x 215 is the
         usual Steam image format), whatever its real size. `cover` then fills
         that frame completely, cropping a little if needed. -->
    <v-img
      :alt="deal.title"
      :aspect-ratio="460 / 215"
      class="deal-card__image"
      cover
      :src="imageUrl"
    >
      <!-- FAVORITE BUTTON, top-left corner of the image.
           The whole card is a link, and this button is INSIDE it. Without
           modifiers, a click would toggle the favorite AND open the deal page:
           - .stop    stops the click from reaching the parent elements
           - .prevent cancels the browser's default action (following the link)
           The icon and colour depend on isFavorite(): when the store's
           `favorites` change, they update by themselves.
           Its dark, see-through background is in the <style> block. -->
      <v-btn
        :aria-label="isFavorite ? 'Remove from favorites' : 'Add to favorites'"
        class="deal-card__favorite ma-2 position-absolute left-0"
        :color="isFavorite ? 'red' : 'white'"
        :icon="isFavorite ? 'mdi-heart' : 'mdi-heart-outline'"
        size="small"
        variant="text"
        @click.stop.prevent="handleToggleFavorite"
      />

      <!-- Discount badge, top-right. Not shown for free games: their price
           already says "Free" in its own colour, "-100%" would repeat it. -->
      <v-chip
        v-if="!isFree"
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
        <div class="d-flex align-center justify-center fill-height bg-grey-darken-3">
          <v-icon color="grey" icon="mdi-gamepad-variant-outline" size="48" />
        </div>
      </template>
    </v-img>

    <!-- flex-grow-1 + d-flex flex-column: this part fills the rest of the card,
         which lets the price row be pushed to the bottom with mt-auto -->
    <div class="pa-4 d-flex flex-column flex-grow-1">
      <!-- STORE: small grey label above the title -->
      <div class="d-flex align-center ga-2 mb-1 text-caption text-medium-emphasis">
        <v-avatar
          v-if="storeLogo"
          rounded="0"
          size="14"
        >
          <v-img :alt="deal.store" :src="storeLogo" />
        </v-avatar>
        {{ deal.store }}
      </div>

      <!-- TITLE: h2 because the page title is the h1 (heading levels help
           screen readers). :title shows the full name if it's cut. -->
      <h2 class="deal-card__title text-subtitle-1 font-weight-bold" :title="deal.title">
        {{ deal.title }}
      </h2>

      <!-- PRICE + SCORES. mt-auto = "automatic top margin": in a flex column
           it takes ALL the free space above, so this block always sits at
           the bottom of the card, whatever the title's length. -->
      <div class="mt-auto pt-3">
        <div class="d-flex align-baseline ga-2 mb-2">
          <span
            class="deal-card__price text-h6 font-weight-bold"
            :class="isFree ? 'text-free' : 'text-success'"
          >
            {{ formatSalePrice(deal.salePrice) }}
          </span>
          <span class="deal-card__price text-body-2 text-disabled text-decoration-line-through">
            {{ formatPrice(deal.normalPrice) }}
          </span>
        </div>

        <!-- Scores coloured like Metacritic does (green / orange / red), so
             they mean something at a glance. The year is plain text. -->
        <div class="d-flex flex-wrap align-center ga-1">
          <v-chip
            v-if="deal.metacriticScore"
            :color="scoreColor(deal.metacriticScore)"
            label
            size="small"
            title="Metacritic score"
            variant="tonal"
          >
            Metacritic {{ deal.metacriticScore }}
          </v-chip>
          <v-chip
            v-if="deal.steamRatingPercent"
            :color="scoreColor(deal.steamRatingPercent)"
            label
            prepend-icon="mdi-steam"
            size="small"
            :title="deal.steamRatingText"
            variant="tonal"
          >
            {{ deal.steamRatingPercent }}%
          </v-chip>
          <span v-if="deal.releaseDate" class="ml-auto text-caption text-disabled">
            {{ formatYear(deal.releaseDate) }}
          </span>
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup>
  import { computed } from 'vue'
  import { toImageUrl } from '@/plugins/axios'
  import { useDealsStore } from '@/stores/deals'
  import { formatPrice, formatSalePrice, formatYear, scoreColor } from '@/utils/format'

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

  const dealsStore = useDealsStore()

  // `computed` values are recalculated only when the data they use changes.
  const imageUrl = computed(() => toImageUrl(props.deal.image))

  // true if this card's deal is in the favorites (store getter with parameter)
  const isFavorite = computed(() => dealsStore.isFavorite(props.deal.id))

  const isFree = computed(() => props.deal.salePrice === 0)

  // Heart click: add/remove the favorite, then confirm with a short message.
  // After toggleFavorite(), isFavorite is already updated, so it tells us
  // which of the two happened.
  function handleToggleFavorite () {
    dealsStore.toggleFavorite(props.deal.id)
    dealsStore.notify(isFavorite.value ? 'Added to favorites' : 'Removed from favorites')
  }
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
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
  }

  /* In a flex column, children may shrink when space is tight: the image
     must always keep its size. */
  .deal-card__image {
    flex-shrink: 0;
  }

  /* :deep() reaches INSIDE the v-img component: its <img> element is
     created by Vuetify, so it doesn't get our scoped attribute and a
     normal scoped selector couldn't target it. We target the `img` tag
     (rather than Vuetify's internal class) so the IDE can check the selector. */
  .deal-card__image :deep(img) {
    transition: transform 0.4s ease;
  }

  .deal-card:hover .deal-card__image :deep(img) {
    transform: scale(1.05);
  }

  /* Heart button: dark and see-through, so it's visible on any image
     without being the brightest thing on the page. backdrop-filter blurs
     the part of the image behind it. */
  .deal-card__favorite {
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(6px);
  }

  /* Titles: at most 2 lines, then "..." (but no fixed height anymore:
     the price row is kept at the bottom by mt-auto instead). */
  .deal-card__title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    line-height: 1.35;
  }

  /* tabular-nums: every digit has the same width, so prices of several
     cards line up neatly and don't "wobble" (1 is normally narrower than 8) */
  .deal-card__price {
    font-variant-numeric: tabular-nums;
  }

  /* Users who asked their system for less motion get no animation */
  @media (prefers-reduced-motion: reduce) {
    .deal-card,
    .deal-card__image :deep(img) {
      transition: none;
    }

    .deal-card:hover,
    .deal-card:hover .deal-card__image :deep(img) {
      transform: none;
    }
  }
</style>
