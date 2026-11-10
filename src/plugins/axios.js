/**
 * plugins/axios.js
 *
 * Creates the ONE configured axios instance of the app, exported as `api`.
 * The store imports it and calls `api.get('/deals')`, `api.get('/stores')`:
 * no other file builds the API's address itself, so if the address
 * changes, only the `.env` file (or this file) needs updating.
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

// An axios "instance" is a pre-configured copy of axios: every request made
// with `api.get('/deals')` automatically becomes
// `GET https://apis.divtec.me/api/cheapshark/deals`, with our timeout.
// axios also turns the JSON answer into a JavaScript object (`response.data`)
// and throws an error for HTTP error codes (404, 500...), which fetch() doesn't.
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
})

export default api

/**
 * The API gives image paths like "/images/cheapshark/deals/1.webp".
 * That path is relative to the API's server, not to our site, so we glue
 * the API's origin (https://apis.divtec.me) in front of it.
 * It lives here because it depends on the API's address.
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
