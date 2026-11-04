/**
 * utils/format.js
 *
 * Small helpers that turn raw API values into text for the screen.
 * They are used by several components (DealCard, pages/deals/[id].vue), so they
 * live here once instead of being copy-pasted in each component.
 * They are "pure" functions: same input -> same output, no side effects.
 */

// Intl.NumberFormat is JavaScript's built-in formatter for numbers and money.
// The API's prices are in US dollars, so we always format them as USD.
const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

// Formats a date as "November 14, 2023".
// `timeZone: 'UTC'` matters: new Date('2023-11-14') means midnight UTC. Without
// it, a browser in a timezone behind UTC (e.g. America) would show November 13.
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'long',
  timeZone: 'UTC',
})

/**
 * 4.99 -> "$4.99". A missing price is shown as "$0.00".
 * @param {number} price
 * @returns {string}
 */
export function formatPrice (price) {
  return priceFormatter.format(price ?? 0)
}

/**
 * Sale price label: "FREE" for 0, otherwise the formatted price.
 * @param {number} price
 * @returns {string}
 */
export function formatSalePrice (price) {
  return price === 0 ? 'FREE' : formatPrice(price)
}

/**
 * "2023-11-14" -> "November 14, 2023". Returns '' when there is no date.
 * @param {string} isoDate Date as "YYYY-MM-DD".
 * @returns {string}
 */
export function formatDate (isoDate) {
  return isoDate ? dateFormatter.format(new Date(isoDate)) : ''
}

/**
 * "2023-11-14" -> "2023". Returns '' when there is no date.
 * `?.` (optional chaining) returns undefined instead of crashing if isoDate is missing.
 * @param {string} isoDate
 * @returns {string}
 */
export function formatYear (isoDate) {
  return isoDate?.slice(0, 4) ?? ''
}

/**
 * Colour of a score, the way Metacritic colours its own scores:
 * 75-100 green (good), 50-74 orange (mixed), 0-49 red (bad).
 * Returns a Vuetify colour name, used by the cards and the detail page.
 * @param {number} score Score from 0 to 100.
 * @returns {string}
 */
export function scoreColor (score) {
  if (score >= 75) {
    return 'success'
  }
  if (score >= 50) {
    return 'warning'
  }
  return 'error'
}

/**
 * "1 deal", "0 deals", "500 deals": adds an "s" except for exactly 1.
 * @param {number} count
 * @param {string} word Singular form, e.g. 'deal'.
 * @returns {string}
 */
export function plural (count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}
