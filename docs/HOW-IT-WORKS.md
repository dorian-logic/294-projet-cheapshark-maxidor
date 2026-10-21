# How the app works

- Step 1: deal list, filters, sorting
- Step 2: detail view, offline fallback, keyboard access (see section 7)

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
├── data/fallback-data.json Saved sample deals, shown when the API is down
├── utils/format.js         Price/date formatting shared by several components
├── components/
│   ├── DealFilters.vue     The filter bar (writes into the store)
│   ├── DealCard.vue        One deal card (props in, `select` event out)
│   ├── DealDetailDialog.vue  Detail view of one deal (props in, events out)
│   └── AppFooter.vue       Footer
├── layouts/default.vue     Top bar + <router-view> + footer around the page
└── pages/index.vue         The only page: loading / error / empty / list + pagination + dialog
scripts/update-fallback.mjs Node script that refreshes the fallback data from the API
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
- Prices and dates are formatted by `utils/format.js` (since step 2):
  `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` is the
  built-in JavaScript way to format money (`4.99` → `$4.99`).
- `v-if` on each score chip: no chip when the API didn't provide the value.
- `formatYear()` uses `isoDate?.slice(0, 4)`: `?.` (optional chaining) stops and returns
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

---

## 7. Step 2: detail view, offline fallback, keyboard access

### Detail view (`DealDetailDialog.vue`)

**Why a dialog instead of a page?** The app has no routing. A dialog keeps the
list, the filters and the scroll position untouched when it closes.

**How it opens and closes**, the whole chain:

```
user clicks a card
  └─> DealCard emits  select(deal)                 (child -> parent: EVENT)
        └─> index.vue: selectedDeal = deal
              └─> <DealDetailDialog :deal="selectedDeal">   (parent -> child: PROP)
                    └─> v-dialog :model-value="deal !== null"  -> open

user presses Escape / clicks outside / "Close"
  └─> dialog emits close
        └─> index.vue: selectedDeal = null  -> deal !== null is false -> closed
```

There is **one** source of truth, `selectedDeal`. There's no separate
`isDialogOpen` boolean, so "open but no deal" or "closed but a deal selected"
cannot happen.

**Props down, events up.** `DealCard` and `DealDetailDialog` never change the
page's data themselves: they *emit events* (`select`, `close`, `show-store`) and
the page decides what to do. That keeps the components reusable and puts all
decisions in one place (the page).

**"All deals from <store>"** emits `show-store(name)`. The page sets
`dealsStore.filters.store = name`, closes the dialog and scrolls up. The list
updates by itself, because `filteredDeals` depends on `filters`.

**Why not call `GET /deals/:id` when opening the dialog?** The list already
contains every field the API has for that deal. A second request would return
the same data, cost a network round-trip, and add a loading state for nothing.

**Calculated values.** The API gives the discount in %, so the amount saved is
computed: `normalPrice - salePrice`. Score bar colours: ≥ 75 green, ≥ 50
orange, otherwise red.

**`utils/format.js`.** Card and dialog both format prices and dates, so the
formatting lives in one file of *pure functions* (same input → same output, no
side effects) instead of being copy-pasted (DRY: Don't Repeat Yourself).
`timeZone: 'UTC'` in the date formatter: `new Date('2023-11-14')` means midnight
UTC; without it a browser in America would display November 13.

### Offline fallback

**Goal:** if the API is unreachable, the user still sees something useful
instead of an error page.

- `src/data/fallback-data.json` holds 17 real deals and the 14 stores, with the
  date they were saved (`savedAt`).
- It's imported with a normal `import` in the store. Vite **bundles it into the
  app at build time**, so it's available even with no network at all.
- In `loadDeals()`, the `catch` block now also does:
  `deals = fallbackData.deals`, `stores = fallbackData.stores`,
  `usingFallback = true`.
- The page shows an orange warning **above** the list (not instead of it):
  why, how old the data is, and a **Retry** button.
- **Retry** calls `loadDeals()` again. The guard at the top was changed to
  `if (deals.length > 0 && !usingFallback) return`. Otherwise "we already have
  data" (the sample data) would block the retry.
- In fallback mode the images and logos can't load (they're on the API's
  server too). The cards show a gamepad icon (`<template #error>` of `v-img`)
  and `storeLogo` returns no logo.

**Refreshing the sample data:** `npm run update-fallback` runs
`scripts/update-fallback.mjs` **in Node, not in the browser**. It downloads the
first 24 deals and the stores and rewrites the JSON with today's date. It uses
`fetch`, which is built into Node 18+. Unlike axios, `fetch` doesn't throw on
HTTP errors, so the script checks `response.ok` itself.

### Keyboard access

Vuetify makes a `v-card` with `@click` clickable with the mouse, but **not**
with the keyboard (you can't reach it with Tab). `DealCard` adds:

| Attribute | Effect |
|---|---|
| `tabindex="0"` | the card can be reached with Tab |
| `role="button"` | screen readers announce it as a button |
| `aria-label` | screen readers read "Show details for <title>" |
| `@keydown.enter` / `@keydown.space.prevent` | the keys open the details, like a real button (`.prevent` stops Space from scrolling the page) |

The dialog itself closes with **Escape** (built into `v-dialog`).

### Questions a teacher might ask (step 2)

**Why does `DealCard` emit an event instead of opening the dialog itself?**
The card doesn't know (and shouldn't know) what clicking means in each place it
is used. The parent decides. That is the "props down, events up" rule.

**Where should `selectedDeal` live: page or store?** Page. Only this page uses
it, and it's temporary UI state. The store holds data shared by several
components.

**What if the fallback file is empty too?** The page still has the red
"Could not load the deals" state (`error && deals.length === 0`).

**Is the fallback data accurate?** It's a copy of real API data on the date in
`savedAt`, and the app says so in the warning. `npm run update-fallback`
refreshes it.

