/**
 * scripts/update-fallback.mjs
 *
 * Refreshes src/data/fallback-data.json with REAL data from the API.
 * That file is what the app shows when the API can't be reached.
 *
 * This script runs in Node.js (in the terminal), NOT in the browser:
 *     npm run update-fallback
 *
 * It downloads the first FALLBACK_SIZE deals (the API returns them ordered by
 * deal rating, so these are the "best" deals) plus all the stores, and saves
 * them with today's date.
 */

import { writeFile } from 'node:fs/promises'

const API_BASE_URL = 'https://apis.divtec.me/api/cheapshark'
const FALLBACK_SIZE = 24 // one page of cards in the app
const OUTPUT_FILE = new URL('../src/data/fallback-data.json', import.meta.url)

/**
 * GET request that returns the parsed JSON body.
 * `fetch` is built into Node.js 18+, so no library is needed here.
 * Unlike axios, fetch does NOT throw on HTTP errors (404, 500...),
 * so we check `response.ok` ourselves.
 */
async function getJson (path) {
  const response = await fetch(API_BASE_URL + path)
  if (!response.ok) {
    throw new Error(`GET ${path} failed with HTTP ${response.status}`)
  }
  return response.json()
}

const [dealsPage, storesPage] = await Promise.all([
  getJson(`/deals?page=1&limit=${FALLBACK_SIZE}`),
  getJson('/stores?limit=100'),
])

const fallbackData = {
  savedAt: new Date().toISOString().slice(0, 10), // "YYYY-MM-DD"
  deals: dealsPage.data,
  stores: storesPage.data,
}

// JSON.stringify(value, null, 2) = readable JSON indented with 2 spaces.
await writeFile(OUTPUT_FILE, JSON.stringify(fallbackData, null, 2) + '\n')

console.log(`Saved ${fallbackData.deals.length} deals and ${fallbackData.stores.length} stores to src/data/fallback-data.json`)
