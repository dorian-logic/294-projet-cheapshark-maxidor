/**
 * stores/deals.js
 *
 * Pinia store that holds the app's shared data: the deals, the stores, the
 * favorites and the current filters.
 *
 * Why a store and not just variables inside the pages?
 * - Several components need the same data: the filter bar writes the
 *   filters, the list page reads them, the cards and the menu read the
 *   favorites. A store is one shared place they can all reach, without
 *   passing props through every level.
 * - The data stays loaded when a page is destroyed (e.g. when opening a deal)
 *   and recreated (when coming back): it is downloaded only once.
 *
 * A Pinia "options" store has three parts:
 * - state:   the raw data (like `data()` in a component)
 * - getters: values CALCULATED from the state, cached and recalculated
 *            automatically when the state they use changes (like `computed`)
 * - actions: functions that change the state, can be async (like `methods`)
 */

import { defineStore } from 'pinia'
import fallbackData from '@/data/fallback-data.json'
import api, { toImageUrl } from '@/plugins/axios'

// The API refuses `limit` values above 100, so 100 is the biggest page we can ask for.
const MAX_PAGE_SIZE = 100

// Name under which the favorites are saved in the browser's localStorage.
// Prefixed with the app's name so it can't clash with another app's data
// (localStorage is shared by every page of the same website address).
const FAVORITES_STORAGE_KEY = 'cheapshark-favorites'

/**
 * Sort criteria shown in the filter bar.
 * - value:        key used in the code (saved in filters.sortBy)
 * - title:        text the user sees
 * - defaultOrder: the direction that makes sense first ('desc' = biggest
 *                 first, 'asc' = smallest first); the toggle button flips it
 * - getValue:     which field of a deal to compare
 * - labels:       text of the toggle button for each direction, so the user
 *                 reads what the order means ("Cheapest first", "A → Z"...)
 */
export const SORT_OPTIONS = [
  { value: 'savings', title: 'Discount', defaultOrder: 'desc', getValue: deal => deal.savings, labels: { asc: 'Smallest first', desc: 'Biggest first' } },
  { value: 'price', title: 'Price', defaultOrder: 'asc', getValue: deal => deal.salePrice, labels: { asc: 'Cheapest first', desc: 'Priciest first' } },
  { value: 'metacritic', title: 'Metacritic score', defaultOrder: 'desc', getValue: deal => deal.metacriticScore, labels: { asc: 'Lowest first', desc: 'Highest first' } },
  { value: 'steamRating', title: 'Steam rating', defaultOrder: 'desc', getValue: deal => deal.steamRatingPercent, labels: { asc: 'Lowest first', desc: 'Highest first' } },
  { value: 'dealRating', title: 'Deal rating', defaultOrder: 'desc', getValue: deal => deal.dealRating, labels: { asc: 'Lowest first', desc: 'Highest first' } },
  { value: 'releaseDate', title: 'Release date', defaultOrder: 'desc', getValue: deal => deal.releaseDate, labels: { asc: 'Oldest first', desc: 'Newest first' } },
  { value: 'title', title: 'Name', defaultOrder: 'asc', getValue: deal => deal.title, labels: { asc: 'A → Z', desc: 'Z → A' } },
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
    sortBy: 'savings', // value of one of the SORT_OPTIONS
    sortOrder: 'desc', // 'asc' (A→Z, small→big) or 'desc' (Z→A, big→small)
  }
}

export const useDealsStore = defineStore('deals', {
  state: () => ({
    deals: [], // every deal downloaded from the API
    stores: [], // every store (used for the logos)
    isLoading: false, // true while the deals are being downloaded
    error: null, // message to show if the download failed, otherwise null
    usingFallback: false, // true when we show the saved sample data instead of the API's
    // Page of results shown in the list. It lives in the store (not in the
    // list page) so it SURVIVES navigation: open a deal, press Back, and you
    // are still on the same page of results.
    currentPage: 1,
    // The filters live in the store (not in the list page) for the same
    // reason: they are kept when the user opens a deal and comes back.
    filters: createDefaultFilters(),
    // IDs of the user's favorite deals, e.g. [12, 57, 3].
    // We store IDs, not whole deal objects: they are small, they can't get
    // out of date (the deal's price always comes from `deals`), and they are
    // easy to save in localStorage.
    favorites: [],
    // IDs of favorites added since the user last opened the favorites page.
    // Only used for the badge in the menu ("something new here"), so it is
    // NOT saved in localStorage: after a reload, nothing is "new" anymore.
    unseenFavorites: [],
    // Short confirmation message ("Added to favorites"), shown by the ONE
    // v-snackbar of the layout. See notify().
    snackbar: { visible: false, text: '' },
  }),

  getters: {
    /** Simple getter (a counter): how many deals are loaded. */
    totalDeals: state => state.deals.length,

    /** Simple getter (a counter): how many favorites the user has. */
    totalFavorites: state => state.favorites.length,

    /**
     * Getter WITH a parameter: it returns a function.
     * getDealById(12) -> the deal with id 12, or undefined.
     * Used by the detail page, which only knows the id (from the URL).
     */
    getDealById: state => id => state.deals.find(deal => deal.id === id),

    /**
     * Getter with a parameter: isFavorite(12) -> true if deal 12 is a favorite.
     * Used to choose the heart icon: filled (favorite) or outlined (not).
     */
    isFavorite: state => id => state.favorites.includes(id),

    /**
     * The favorite deals as full objects (not just IDs), for the favorites page.
     * Each ID is turned into its deal with find(). If a favorite's deal isn't
     * in `deals` (e.g. it's no longer on sale, or we're offline with only the
     * sample data), find() returns undefined: the filter() removes those
     * so the page never tries to display `undefined`.
     */
    getFavorites: state => state.favorites
      .map(id => state.deals.find(deal => deal.id === id))
      .filter(deal => deal !== undefined),

    /**
     * true if at least one filter is active (the sort doesn't count: it
     * changes the order, not which deals are shown). Used to show the
     * "Reset filters" button only when there is something to reset.
     */
    hasActiveFilters: state => {
      const { search, store, maxPrice, minSavings } = state.filters
      return Boolean((search ?? '').trim()) || store !== null || maxPrice !== null || minSavings > 0
    },

    /** Date at which the fallback sample data was saved (shown in the warning). */
    fallbackSavedAt: () => fallbackData.savedAt,

    /**
     * Names of the stores that actually have deals, sorted A-Z.
     * Used to fill the "Store" dropdown. A Set removes duplicates,
     * `[...set]` turns it back into an array, toSorted() sorts A-Z.
     */
    storeNames: state => [...new Set(state.deals.map(deal => deal.store))].toSorted(),

    /**
     * Getter with a parameter: storeLogo('Steam') -> full URL of Steam's logo.
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
  },

  actions: {
    /**
     * Prepares the store when the app starts. Called ONCE, in App.vue.
     * 1. The favorites are read from localStorage FIRST: it's instant
     *    (synchronous), so the hearts are already right when the deals appear.
     *    (Loading them after the downloads would leave a moment with the deals
     *    shown but no favorites.)
     * 2. The deals and the stores are downloaded IN PARALLEL with
     *    Promise.all: total time = the slowest request, not the sum of both.
     */
    async init () {
      this.loadFavorites()
      await Promise.all([this.fetchDeals(), this.fetchStores()])
    },

    /**
     * Downloads EVERY deal (500 at the time of writing) with api.get().
     *
     * Why download everything instead of one page at a time?
     * The API can only filter by exact field values; it cannot sort, and it
     * cannot do "price below X" or "discount above Y%". To offer those
     * features we need all the deals in the browser, and 500 small objects
     * is light (a few hundred KB), so it is the simplest reliable option.
     *
     * The API returns pages: { data: [...deals], pagination: { pages, ... } }
     * 1. Fetch page 1. Its `pagination.pages` tells us how many pages exist.
     * 2. Start the requests for pages 2..N at the same time, then wait for
     *    all of them with Promise.all (faster than one after the other).
     * 3. Merge every page's `data` array into one flat array.
     */
    async fetchDeals () {
      // Already loaded from the API: no need to download everything again.
      // (If we are showing the fallback data, we DO try again: that's "Retry".)
      if (this.deals.length > 0 && !this.usingFallback) {
        return
      }
      // A download is already running: don't start a second one in parallel.
      if (this.isLoading) {
        return
      }

      this.isLoading = true
      this.error = null

      try {
        // `params` is turned into the query string by axios: ?page=1&limit=100
        // axios puts the parsed JSON body in `response.data`.
        const firstResponse = await api.get('/deals', { params: { page: 1, limit: MAX_PAGE_SIZE } })
        const totalPages = firstResponse.data.pagination.pages

        const otherRequests = []
        for (let page = 2; page <= totalPages; page++) {
          // No `await` here: we only START the request and keep its Promise.
          otherRequests.push(api.get('/deals', { params: { page, limit: MAX_PAGE_SIZE } }))
        }
        // Waits until every request has finished. If ONE fails, Promise.all
        // fails too, and we go to `catch`.
        const otherResponses = await Promise.all(otherRequests)

        // [[deals of page 1], [deals of page 2], ...] -> [deal, deal, deal, ...]
        this.deals = [firstResponse, ...otherResponses].flatMap(response => response.data.data)
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
        // The pages see `usingFallback` and warn the user that the data is old.
        this.deals = fallbackData.deals
        this.usingFallback = true
      } finally {
        // `finally` runs in both cases (success or error),
        // so the loading indicator always disappears.
        this.isLoading = false
      }
    },

    /**
     * Downloads the list of stores (Steam, GOG, Epic Games Store...), used
     * for the logos next to each deal. If it fails, the saved list is used
     * (same idea as the deals' fallback).
     */
    async fetchStores () {
      try {
        const response = await api.get('/stores', { params: { limit: MAX_PAGE_SIZE } })
        this.stores = response.data.data
      } catch (error) {
        console.error('Failed to load stores:', error)
        this.stores = fallbackData.stores
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

    /**
     * Changes the sort criterion, and puts the direction back to the one
     * that makes sense for it (e.g. "Price" starts with the cheapest).
     * @param {string} sortBy Value of one of the SORT_OPTIONS.
     */
    setSortBy (sortBy) {
      const option = SORT_OPTIONS.find(o => o.value === sortBy)
      this.filters.sortBy = sortBy
      this.filters.sortOrder = option ? option.defaultOrder : 'asc'
    },

    /** The sort toggle button: ascending <-> descending. */
    toggleSortOrder () {
      this.filters.sortOrder = this.filters.sortOrder === 'asc' ? 'desc' : 'asc'
    },

    /**
     * Adds the deal to the favorites, or removes it if it's already there
     * (the "toggle" pattern: one button, two effects), then saves.
     * @param {number} id Deal id.
     */
    toggleFavorite (id) {
      if (this.isFavorite(id)) {
        // filter() keeps every id EXCEPT this one -> removed
        this.favorites = this.favorites.filter(favoriteId => favoriteId !== id)
        // If it was a new, unseen favorite, it isn't "new" anymore either
        this.unseenFavorites = this.unseenFavorites.filter(favoriteId => favoriteId !== id)
      } else {
        this.favorites.push(id)
        this.unseenFavorites.push(id)
      }
      this.saveFavorites()
    },

    /**
     * Shows a short confirmation message at the bottom of the screen.
     * The message is in the store, and ONE v-snackbar in layouts/default.vue
     * displays it. Why not a snackbar inside each card? On the favorites page,
     * removing a favorite removes its card immediately, and a snackbar inside
     * that card would disappear with it before it could be read.
     * @param {string} text Message to show.
     */
    notify (text) {
      this.snackbar = { visible: true, text }
    },

    /**
     * Called when the user opens the favorites page: they have now SEEN the
     * new favorites, so the badge in the menu disappears.
     */
    markFavoritesSeen () {
      this.unseenFavorites = []
    },

    /**
     * Saves the favorites in localStorage, so they survive a page reload.
     * localStorage can only store TEXT, so the array [12, 57] is converted
     * to the string "[12,57]" with JSON.stringify().
     */
    saveFavorites () {
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(this.favorites))
      } catch (error) {
        // Storage full or blocked (e.g. some private browsing modes):
        // the favorites still work until the page is reloaded.
        console.error('Could not save favorites:', error)
      }
    },

    /**
     * Reads the favorites saved by saveFavorites().
     * JSON.parse() turns the text "[12,57]" back into the array [12, 57].
     */
    loadFavorites () {
      try {
        const saved = localStorage.getItem(FAVORITES_STORAGE_KEY)
        // First visit: nothing saved yet, getItem() returns null.
        if (!saved) {
          this.favorites = []
          return
        }
        const parsed = JSON.parse(saved)
        // Only accept what we expect: an array of numbers.
        this.favorites = Array.isArray(parsed) ? parsed.filter(id => typeof id === 'number') : []
      } catch (error) {
        // The saved text isn't valid JSON (edited by hand, corrupted...):
        // start with no favorites instead of crashing the whole app.
        console.warn('Ignoring invalid saved favorites:', error)
        this.favorites = []
      }
    },
  },
})
