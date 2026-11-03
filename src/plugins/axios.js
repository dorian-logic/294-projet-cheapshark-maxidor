/**
 * plugins/axios.js
 *
 * The ONLY file that knows how to talk to the school's CheapShark API.
 * Components and stores never build URLs themselves: they call the
 * functions exported here. If the API address or format ever changes,
 * this is the single place to update.
 *
 * API documentation: https://apis.divtec.me/api/cheapshark/docs
 */

import axios from 'axios'

// Base address of the API. It is read from the `.env` file (Vite only exposes
// variables that start with `VITE_`). If the variable is missing, for example
// on a fresh clone, we fall back to the school's address so the app still works.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://apis.divtec.me/api/cheapshark'

// How long (in milliseconds) we wait for an answer before giving up.
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 10_000

// The API refuses `limit` values above 100, so 100 is the biggest page we can ask for.
const MAX_PAGE_SIZE = 100

// An axios "instance" is a pre-configured copy of axios: every request made
// with `api.get('/deals')` automatically becomes
// `GET https://apis.divtec.me/api/cheapshark/deals` with our timeout.
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
})

/**
 * Fetches ONE page of deals.
 *
 * The API answers with this shape:
 * {
 *   data: [ { id, title, store, salePrice, normalPrice, savings, ... }, ... ],
 *   pagination: { page, limit, total, pages }
 * }
 *
 * @param {number} page  Page number, starting at 1.
 * @param {number} limit Number of deals per page (max 100).
 * @returns {Promise<{data: Array, pagination: Object}>}
 */
export async function fetchDealsPage (page = 1, limit = MAX_PAGE_SIZE) {
  // `params` is turned into the query string by axios: ?page=1&limit=100
  const response = await api.get('/deals', { params: { page, limit } })
  // axios puts the parsed JSON body in `response.data`.
  return response.data
}

/**
 * Fetches EVERY deal (500 at the time of writing) by downloading all pages.
 *
 * Why download everything instead of one page at a time?
 * The API can only filter by exact field values; it cannot sort, and it
 * cannot do "price below X" or "discount above Y%". To offer those
 * features we need all the deals in the browser, and 500 small objects
 * is light (a few hundred KB), so it is the simplest reliable option.
 *
 * Strategy:
 * 1. Fetch page 1. Its `pagination.pages` tells us how many pages exist.
 * 2. Start the requests for pages 2..N at the same time, then wait for
 *    all of them with Promise.all (faster than one after the other).
 * 3. Merge every page's `data` array into one flat array.
 *
 * @returns {Promise<Array>} All deals.
 */
export async function fetchAllDeals () {
  const firstPage = await fetchDealsPage(1)
  const totalPages = firstPage.pagination.pages

  const otherPageRequests = []
  for (let page = 2; page <= totalPages; page++) {
    // No `await` here: we only START the request and keep its Promise.
    otherPageRequests.push(fetchDealsPage(page))
  }

  // Waits until every request has finished. If ONE fails, Promise.all fails,
  // and the error goes up to the store, which shows an error message.
  const otherPages = await Promise.all(otherPageRequests)

  // [[deals of page 1], [deals of page 2], ...] -> [deal, deal, deal, ...]
  return [firstPage, ...otherPages].flatMap(page => page.data)
}

/**
 * Fetches the list of stores (Steam, GOG, Epic Games Store...).
 * We use it to show each store's logo next to its deals.
 *
 * @returns {Promise<Array<{id: number, name: string, image: string}>>}
 */
export async function fetchStores () {
  const response = await api.get('/stores', { params: { limit: MAX_PAGE_SIZE } })
  return response.data.data
}

/**
 * The API gives image paths like "/images/cheapshark/deals/1.webp".
 * That path is relative to the API's server, not to our site, so we glue
 * the API's origin (https://apis.divtec.me) in front of it.
 *
 * @param {string} path Image path returned by the API.
 * @returns {string} Full image URL, or '' when there is no image.
 */
export function toImageUrl (path) {
  if (!path) {
    return ''
  }
  if (path.startsWith('http')) {
    return path // Already a full URL, nothing to do.
  }
  const apiOrigin = new URL(API_BASE_URL).origin // "https://apis.divtec.me"
  return apiOrigin + path
}
