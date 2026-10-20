# How the app works — step 1 (deal list, filters, sorting)

This document explains the **logic and the reasons** behind the code, so that
every part can be explained and defended. The code itself is commented line
by line; this file gives the big picture.

---

## 1. The data source: the school's CheapShark API

Base URL: `https://apis.divtec.me/api/cheapshark` — docs at `/docs`.

It is **not** the real CheapShark API (`cheapshark.com`). It is a teaching
copy with a **fixed snapshot** of data:

| Endpoint | What it returns |
|---|---|
| `GET /deals?page=&limit=` | 500 deals, paginated (`limit` max **100**) |
| `GET /deals/:id` | one deal |
| `GET /stores` | 14 stores (id, name, logo) |

Every list answer has the same shape:

```json
{
  "data": [ { "id": 1, "title": "Astral Ascent", "store": "Epic Games Store",
              "salePrice": 0, "normalPrice": 24.99, "savings": 100,
              "metacriticScore": 86, "steamRatingPercent": 95,
              "steamRatingText": "Overwhelmingly Positive", "dealRating": 10,
              "releaseDate": "2023-11-14", "image": "/images/cheapshark/deals/1.webp" } ],
  "pagination": { "page": 1, "limit": 100, "total": 500, "pages": 5 }
}
```

Things the API **cannot** do, and which shaped the design:

- It cannot **sort**.
- It can only filter by **exact value** (`?store=Steam`), not "price below 5"
  or "discount above 50 %".
- Some deals simply **lack** `metacriticScore`, `steamRatingPercent` or
  `releaseDate` (the field is missing, not `null`).
- Image paths are **relative** to the API server (`/images/...`).

---

## 2. Architecture: who does what

```
src/
├── services/api.js         Talks to the API (axios). Nothing else does.
├── stores/deals.js         Pinia store: the data + filters + filtering/sorting logic
├── components/
│   ├── DealFilters.vue     The filter bar (writes into the store)
│   ├── DealCard.vue        One deal card (receives a deal via props)
│   └── AppFooter.vue       Footer
├── layouts/default.vue     Top bar + <router-view> + footer around the page
└── pages/index.vue         The only page: loading / error / empty / list + pagination
```

Each layer has **one responsibility** ("separation of concerns"):

| Layer | Knows about HTTP? | Knows about the screen? |
|---|---|---|
| `services/api.js` | yes | no |
| `stores/deals.js` | no (calls the service) | no |
| components / page | no | yes |

So if the API changes, only `api.js` changes. If the design changes, only the
components change.

---

## 3. Data flow

**At start-up**

```
pages/index.vue  onMounted()
   └─> dealsStore.loadDeals()                (action)
         ├─> loading = true
         ├─> fetchAllDeals() + fetchStores()  (service, in parallel)
         │      └─> GET /deals?page=1 ... page=5, GET /stores
         ├─> deals = [...500 deals], stores = [...]
         └─> loading = false   (in `finally`, also on error)
```

**When the user changes a filter**

```
user types "batman" in DealFilters
   └─> v-model writes dealsStore.filters.search
         └─> getter filteredDeals is recalculated automatically
               └─> index.vue (which displays filteredDeals) re-renders
               └─> watch(filters) puts the list back on page 1
```

No function is called by hand to "apply" the filters: this is Vue's
**reactivity**. When reactive data changes, everything that depends on it
(computed values, getters, templates) updates itself.

---

## 4. File by file: the important decisions

### `services/api.js`

- **`axios.create({ baseURL, timeout })`** builds a pre-configured axios
  instance. Every call (`api.get('/deals')`) automatically gets the base URL
  and the timeout, so they are written once.
- **`params: { page, limit }`**: axios builds the query string
  `?page=1&limit=100` for us (and encodes special characters).
- **`fetchAllDeals()` downloads all 500 deals.** Why? Because the API can't
  sort or do "less than / greater than" filters, the browser has to do it, and
  for that it needs all the data. 500 small objects is a small download.
  1. Load page 1 → read `pagination.pages` (= 5). We never hard-code "5",
     so it still works if the number of deals changes.
  2. Start pages 2 to 5 **at the same time** and wait for all of them with
     `Promise.all` (faster than 4 requests one after the other).
  3. `flatMap(page => page.data)` merges `[[...], [...], ...]` into one array.
- **`toImageUrl(path)`** turns `/images/x.webp` into
  `https://apis.divtec.me/images/x.webp`. Without it the browser would look
  for the image on *our* server (`localhost:3000/images/...`) and fail.
- **`import.meta.env.VITE_API_BASE_URL`**: Vite reads the `.env` file and
  exposes variables starting with `VITE_`. The `||` fallback means the app
  still works when `.env` doesn't exist (fresh clone, GitHub Pages).

### `stores/deals.js` (Pinia, "options" syntax)

| Part | Contains | Comparable to |
|---|---|---|
| `state` | `deals`, `stores`, `loading`, `error`, `filters` | `data()` |
| `getters` | `storeNames`, `storeLogo`, `filteredDeals` | `computed` |
| `actions` | `loadDeals()`, `resetFilters()` | `methods` |

- **Why a store?** The filter bar *writes* the filters and the page *reads* the
  result. Both need the same data. The store is one shared instance:
  every `useDealsStore()` call returns the same object.
- **`filteredDeals`** is the heart of the app:
  1. `filter()` keeps a deal only if it passes **all** active filters
     (an empty filter = ignored).
  2. `toSorted(SORTERS[sortBy])` sorts a **copy**, so `state.deals` is never
     modified.
  Getters are **cached**: it only recalculates when `deals` or `filters` change.
- **Compare functions** (`SORTERS`): `sort/toSorted` call `(a, b)`;
  a negative result puts `a` first. `b.x - a.x` = biggest first,
  `a.x - b.x` = smallest first. Dates `"YYYY-MM-DD"` sort correctly as text,
  so `localeCompare` is enough.
- **`?? 0`** (nullish coalescing): "use 0 if the value is `null`/`undefined`".
  Needed because some deals don't have a score or date.
  (`||` would also replace a real `0`, which `??` doesn't.)
- **`storeLogo` returns a function**: that's how a Pinia getter takes a
  parameter (`storeLogo('Steam')`).
- **`createDefaultFilters()` is a function**, not a constant object: each reset
  gets a brand-new object, so the default values can never be modified by
  accident.
- **`loadDeals()`** uses `try / catch / finally`:
  - `try`: download. `catch`: save a readable message in `error`.
  - `error.response` exists → the server answered with an error code (404,
    500…). It doesn't exist → the server was never reached (offline, timeout).
  - `finally` always runs → the spinner always stops, even after an error.
  - The guard `if (this.deals.length > 0) return` avoids downloading again.

### `components/DealFilters.vue`

- Each field uses **`v-model="dealsStore.filters.xxx"`**: two-way binding
  directly on the store. Typing updates the store; resetting the store
  updates the fields.
- Max price uses a **fixed list** instead of a free text field → no invalid
  input to validate. Clearing it sets `null` = no limit.

### `components/DealCard.vue`

- A **presentational** component: it only receives data through **props**
  (`deal`, `storeLogo`) and displays it. It doesn't know where the data comes
  from → reusable anywhere.
- Props are declared with `type` and `required`, so Vue warns in the console
  if they are used wrongly.
- `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` is the
  built-in JavaScript way to format money (`4.99` → `$4.99`).
- `v-if` on each score chip: no chip when the API didn't provide the value.
- `releaseDate?.slice(0, 4)`: `?.` (optional chaining) stops and returns
  `undefined` instead of crashing when `releaseDate` is missing.

### `pages/index.vue`

- **`onMounted`** starts the loading when the page appears.
- **Four exclusive states** with `v-if / v-else-if / v-else`: loading → error
  (with *Retry*) → no results (with *Reset filters*) → list. A user is
  never left in front of an empty screen without explanation.
- **Client-side pagination**: 24 cards per page.
  - `pageCount = Math.ceil(total / 24)` (rounded **up**: 25 deals = 2 pages).
  - `visibleDeals = filteredDeals.slice(start, start + 24)` with
    `start = (page - 1) * 24`.
  - `currentPage` lives in the page, not the store: it's purely visual state
    nobody else needs.
- **`watch(() => dealsStore.filters, ..., { deep: true })`** goes back to
  page 1 whenever a filter changes, otherwise you could be on page 5 of a
  result that only has 1 page. `deep: true` = also detect changes *inside* the
  object (e.g. only `filters.search` changed).
- `:key="deal.id"` on `v-for` lets Vue track each card when the list is
  re-ordered, instead of re-creating everything.

---

## 5. Questions a teacher might ask

**Why axios and not `fetch`?** Base URL and timeout configured once,
automatic JSON parsing, automatic query string from `params`, and it throws
an error on HTTP error codes (`fetch` doesn't, you must check `response.ok`).

**Why load all deals instead of one page at a time?** The API can't sort or
filter by ranges; to sort "lowest price" over *all* deals, you need all deals.
500 records is small, and it is downloaded only once.

**Why `Promise.all`?** The 4 remaining page requests are independent, so they
run in parallel. Total time ≈ the slowest request, not the sum of all.

**Getter vs action?** A getter *computes* a value from the state (no side
effects, cached). An action *changes* the state and can be `async`.

**Props vs store?** `DealCard` uses props because it just displays what it's
given (reusable). `DealFilters` uses the store because its job is precisely to
change shared state.

**What happens if the API is down?** The `catch` stores a message, the page
shows a red alert with a *Retry* button that calls `loadDeals()` again.

**Why `toSorted()` and not `sort()`?** `sort()` modifies the array in place;
in a store that could change `state.deals` by accident. `toSorted()` returns a
new sorted array. (The project's ESLint config also requires it.)

**Why is `.env` not committed?** Convention: `.env` holds local settings
(and secrets in other projects). `.env.example` is committed to show which
variables exist. This API has no key, so the code also has a default value.

---

## 6. Running it

```bash
copy .env.example .env      # optional, Windows (cp on macOS/Linux)
npm run dev                 # http://localhost:3000
```

Note: `npm run lint` reports 5 "import order" errors in files from the
Vuetify template (`main.js`, `plugins/`, `router/`). They existed before this
step; `npm run lint` fixes them automatically (it runs with `--fix`).
