/**
 * stores/deals.js
 *
 * Pinia store that holds ALL the deal data of the app and the current filters.
 *
 * Why a store and not just variables inside the page?
 * - Several components need the same data: the filter bar writes the
 *   filters, the page reads the filtered list. A store is one shared
 *   place they can all reach, without passing props through every level.
 * - The data stays loaded even if a component is destroyed and recreated.
 *
 * A Pinia "options" store has three parts:
 * - state:   the raw data (like `data()` in a component)
 * - getters: values CALCULATED from the state, cached and recalculated
 *            automatically when the state they use changes (like `computed`)
 * - actions: functions that change the state, can be async (like `methods`)
 */

import { defineStore } from 'pinia'
import fallbackData from '@/data/fallback-data.json'
import { fetchAllDeals, fetchStores, toImageUrl } from '@/services/api'

/**
 * Sort choices shown in the filter bar.
 * `value` is the key used in the code, `title` is the text the user sees.
 */
export const SORT_OPTIONS = [
  { value: 'savings', title: 'Biggest discount (%)' },
  { value: 'priceAsc', title: 'Lowest price' },
  { value: 'metacritic', title: 'Best Metacritic score' },
  { value: 'steamRating', title: 'Best Steam rating' },
  { value: 'dealRating', title: 'Best deal rating' },
  { value: 'newest', title: 'Most recent games' },
]

/**
 * "Maximum price" choices. A fixed list is easier to use than a free text
 * field and avoids invalid input. "No limit" is not in the list: it's
 * represented by `null`, which is what the field contains when it is cleared.
 */
export const MAX_PRICE_OPTIONS = [
  { value: 0, title: 'Free only' },
  { value: 1, title: 'Under $1' },
  { value: 5, title: 'Under $5' },
  { value: 10, title: 'Under $10' },
  { value: 20, title: 'Under $20' },
]

/**
 * One compare function per sort option, used with Array.prototype.toSorted().
 *
 * How a compare function works: toSorted() calls it with two deals (a, b).
 * - result < 0  -> a is placed before b
 * - result > 0  -> b is placed before a
 * - result = 0  -> order unchanged
 * So `b.x - a.x` sorts from biggest to smallest, `a.x - b.x` the opposite.
 *
 * Some deals have no Metacritic score, Steam rating or release date (the
 * field is simply missing). `?? 0` / `?? ''` replaces a missing value so those
 * deals end up at the bottom instead of breaking the sort.
 */
const SORTERS = {
  savings: (a, b) => (b.savings ?? 0) - (a.savings ?? 0),
  priceAsc: (a, b) => (a.salePrice ?? 0) - (b.salePrice ?? 0),
  metacritic: (a, b) => (b.metacriticScore ?? 0) - (a.metacriticScore ?? 0),
  steamRating: (a, b) => (b.steamRatingPercent ?? 0) - (a.steamRatingPercent ?? 0),
  dealRating: (a, b) => (b.dealRating ?? 0) - (a.dealRating ?? 0),
  // Dates are "YYYY-MM-DD" strings. In that format, alphabetical order is
  // also chronological order, so comparing the strings is enough.
  newest: (a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''),
}

/**
 * Returns a NEW object with the default filters.
 * It's a function (not a constant object) so that every reset gets a fresh
 * object instead of sharing (and modifying) the same one.
 */
function createDefaultFilters () {
  return {
    search: '', // text typed in the search field
    store: null, // store name, or null = all stores
    maxPrice: null, // see MAX_PRICE_OPTIONS, null = no limit
    minSavings: 0, // minimum discount in %
    sortBy: 'savings', // key of SORTERS
  }
}

export const useDealsStore = defineStore('deals', {
  state: () => ({
    deals: [], // every deal downloaded from the API
    stores: [], // every store (used for the logos)
    loading: false, // true while the download is in progress
    error: null, // message to show if the download failed, otherwise null
    usingFallback: false, // true when we show the saved sample data instead of the API's
    // Page of results shown in the list. It lives in the store (not in the
    // list page) so it SURVIVES navigation: open a deal, press Back, and you
    // are still on the same page of results.
    currentPage: 1,
    filters: createDefaultFilters(),
  }),

  getters: {
    /**
     * Returns a function: dealById(12) -> the deal with id 12, or undefined.
     * Used by the detail page, which only knows the id (from the URL).
     */
    dealById: state => id => state.deals.find(deal => deal.id === id),

    /** Date at which the fallback sample data was saved (shown in the warning). */
    fallbackSavedAt: () => fallbackData.savedAt,

    /**
     * Names of the stores that actually have deals, sorted A-Z.
     * Used to fill the "Store" dropdown. A Set removes duplicates,
     * `[...set]` turns it back into an array, toSorted() sorts A-Z.
     */
    storeNames: state => [...new Set(state.deals.map(deal => deal.store))].toSorted(),

    /**
     * Returns a function: storeLogo('Steam') -> full URL of Steam's logo.
     * A getter that returns a function is Pinia's way to make a getter
     * that takes a parameter.
     */
    storeLogo: state => storeName => {
      // The logos are hosted on the API's server: if we are in fallback mode,
      // that server is unreachable, so return no logo instead of a broken image.
      if (state.usingFallback) {
        return ''
      }
      const store = state.stores.find(s => s.name === storeName)
      return store ? toImageUrl(store.image) : ''
    },

    /**
     * THE core of the app: the deals that match the current filters,
     * in the chosen order.
     *
     * Pinia caches this result. It is only recalculated when `deals` or
     * one of the `filters` changes, not every time a component reads it.
     */
    filteredDeals: state => {
      const { search, store, maxPrice, minSavings, sortBy } = state.filters
      const searchText = (search ?? '').trim().toLowerCase()

      // 1. FILTER: keep a deal only if it passes every active filter.
      //    `return false` = rejected, `return true` = kept.
      const matchingDeals = state.deals.filter(deal => {
        if (searchText && !deal.title.toLowerCase().includes(searchText)) {
          return false
        }
        if (store && deal.store !== store) {
          return false
        }
        if (maxPrice !== null && deal.salePrice > maxPrice) {
          return false
        }
        if ((deal.savings ?? 0) < minSavings) {
          return false
        }
        return true
      })

      // 2. SORT: toSorted() returns a sorted COPY. Unlike sort(), it never
      //    modifies the original array, so `state.deals` keeps its order.
      return matchingDeals.toSorted(SORTERS[sortBy])
    },
  },

  actions: {
    /**
     * Downloads the deals and the stores from the API and saves them in the state.
     * Called by the page when it appears on screen.
     */
    async loadDeals () {
      // Already loaded from the API: no need to download everything again.
      // (If we are showing the fallback data, we DO try again: that's "Retry".)
      if (this.deals.length > 0 && !this.usingFallback) {
        return
      }
      // A download is already running (e.g. the list page and the detail page
      // both asked for the data): don't start a second one in parallel.
      if (this.loading) {
        return
      }

      this.loading = true
      this.error = null

      try {
        // Both downloads run at the same time; we wait for both.
        const [deals, stores] = await Promise.all([fetchAllDeals(), fetchStores()])
        this.deals = deals
        this.stores = stores
        this.usingFallback = false
      } catch (error) {
        // Full details in the browser console for us developers...
        console.error('Failed to load deals:', error)
        // ...and a readable message for the user.
        // axios sets `error.response` when the server answered with an error
        // code (404, 500...). Without it, the server was never reached
        // (no internet, timeout, wrong address).
        this.error = error.response
          ? `The deals API answered with an error (HTTP ${error.response.status}).`
          : 'The deals API could not be reached. Check your internet connection.'

        // FALLBACK: instead of an empty page, show the sample deals saved in
        // src/data/fallback-data.json. They are bundled with the app at build
        // time, so they are always available, even without network.
        // The page sees `usingFallback` and warns the user that the data is old.
        this.deals = fallbackData.deals
        this.stores = fallbackData.stores
        this.usingFallback = true
      } finally {
        // `finally` runs in both cases (success or error),
        // so the loading indicator always disappears.
        this.loading = false
      }
    },

    /** Puts every filter back to its default value. */
    resetFilters () {
      this.filters = createDefaultFilters()
    },

    /**
     * Shows only the deals of one store, starting from the first page.
     * Used by the detail page's "All deals from <store>" button.
     */
    filterByStore (storeName) {
      this.filters.store = storeName
      this.currentPage = 1
    },
  },
})
