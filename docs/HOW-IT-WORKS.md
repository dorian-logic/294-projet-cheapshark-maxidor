# How the app works

- Step 1: deal list, filters, sorting (sections 1-6)
- Step 2: offline fallback, shared formatting (section 7)
- Step 3: Vue Router, one page per deal, 404 page (section 8)
- Step 4: names aligned with the course, styling (section 9)

(Step 2 first showed the details in a dialog. Step 3 replaced it with a real
page per deal, as recommended in class.)

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
├── plugins/axios.js        Talks to the API (axios). Nothing else does.
├── stores/deals.js         Pinia store: the data + filters + filtering/sorting logic
├── data/fallback-data.json Saved sample deals, shown when the API is down
├── utils/format.js         Price/date formatting shared by several components
├── components/
│   ├── DealFilters.vue     The filter bar (writes into the store)
│   ├── DealCard.vue        One deal card (props in), a link to its detail page
│   └── AppFooter.vue       Footer
├── layouts/default.vue     Top bar + <router-view> + footer around every page
├── router/index.js         Creates the router (routes generated from src/pages/)
└── pages/                  One file = one page (file-based routing)
    ├── index.vue           "/"            the list: loading / error / empty / cards + pagination
    ├── deals/[id].vue      "/deals/:id"   the detail page of one deal
    └── [...path].vue       anything else  "Page not found" (404)
scripts/update-fallback.mjs Node script that refreshes the fallback data from the API
```

Each layer has **one responsibility** ("separation of concerns"):

| Layer | Knows about HTTP? | Knows about the screen? |
|---|---|---|
| `plugins/axios.js` | yes | no |
| `stores/deals.js` | no (calls the service) | no |
| components / page | no | yes |

So if the API changes, only `api.js` changes. If the design changes, only the
components change.

---

## 3. Data flow

**At start-up**

```
pages/index.vue  onMounted()
   └─> dealsStore.fetchDeals()                (action)
         ├─> isLoading = true
         ├─> fetchAllDeals() + fetchStores()  (service, in parallel)
         │      └─> GET /deals?page=1 ... page=5, GET /stores
         ├─> deals = [...500 deals], stores = [...]
         └─> isLoading = false   (in `finally`, also on error)
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

### `plugins/axios.js`

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
- **`import.meta.env.VITE_API_URL`**: Vite reads the `.env` file and
  exposes variables starting with `VITE_`. The `||` fallback means the app
  still works when `.env` doesn't exist (fresh clone, GitHub Pages).

### `stores/deals.js` (Pinia, "options" syntax)

| Part | Contains | Comparable to |
|---|---|---|
| `state` | `deals`, `stores`, `isLoading`, `error`, `filters` | `data()` |
| `getters` | `storeNames`, `storeLogo`, `filteredDeals` | `computed` |
| `actions` | `fetchDeals()`, `resetFilters()` | `methods` |

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
- **`fetchDeals()`** uses `try / catch / finally`:
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
  - `currentPage` lives in the **store** (since step 3): the list page is
    destroyed when you open a deal, so a local variable would reset to page 1
    every time you come back.
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
shows a red alert with a *Retry* button that calls `fetchDeals()` again.

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

## 7. Step 2: offline fallback and shared formatting

### Offline fallback

**Goal:** if the API is unreachable, the user still sees something useful
instead of an error page.

- `src/data/fallback-data.json` holds 17 real deals and the 14 stores, with the
  date they were saved (`savedAt`).
- It's imported with a normal `import` in the store. Vite **bundles it into the
  app at build time**, so it's available even with no network at all.
- In `fetchDeals()`, the `catch` block also does:
  `deals = fallbackData.deals`, `stores = fallbackData.stores`,
  `usingFallback = true`.
- The list shows an orange warning **above** the cards (not instead of them):
  why, how old the data is, and a **Retry** button.
- **Retry** calls `fetchDeals()` again. The guard at the top is
  `if (deals.length > 0 && !usingFallback) return`. Otherwise "we already have
  data" (the sample data) would block the retry.
- In fallback mode the images and logos can't load (they're on the API's
  server too). Cards show a gamepad icon (`<template #error>` of `v-img`)
  and `storeLogo` returns no logo.

**Refreshing the sample data:** `npm run update-fallback` runs
`scripts/update-fallback.mjs` **in Node, not in the browser**. It downloads the
first 24 deals and the stores and rewrites the JSON with today's date. It uses
`fetch`, which is built into Node 18+. Unlike axios, `fetch` doesn't throw on
HTTP errors, so the script checks `response.ok` itself.

### `utils/format.js`

The card and the detail page both format prices and dates, so the formatting
lives in one file of *pure functions* (same input → same output, no side
effects) instead of being copy-pasted (DRY: Don't Repeat Yourself).
`timeZone: 'UTC'` in the date formatter: `new Date('2023-11-14')` means midnight
UTC; without it a browser in America would display November 13.

### Questions a teacher might ask (step 2)

**What if the fallback file is empty too?** The list still has the red
"Could not load the deals" state (`error && deals.length === 0`).

**Is the fallback data accurate?** It's a copy of real API data on the date in
`savedAt`, and the app says so in the warning. `npm run update-fallback`
refreshes it.

---

## 8. Step 3: Vue Router, one page per deal

### Routes come from files

The project uses **file-based routing** (`unplugin-vue-router`, set up by the
Vuetify template). Nobody writes a list of routes by hand: every `.vue` file in
`src/pages/` becomes a route.

| File | URL | Shows |
|---|---|---|
| `pages/index.vue` | `/` | the deal list |
| `pages/deals/[id].vue` | `/deals/12` | the deal with id 12 |
| `pages/[...path].vue` | anything else | "Page not found" |

- `[id]` = a **dynamic segment**: whatever is in that part of the URL is
  available in the page as `route.params.id`.
- `[...path]` = a **catch-all**: it matches every address. The router always
  prefers the most specific route, so it's only used when nothing else matches.
- `router/index.js` creates the router with these generated routes, and
  `layouts/default.vue` contains `<router-view />`: the spot where the page
  matching the current URL is displayed, between the top bar and the footer.
- `typed-router.d.ts` is generated automatically when the dev server runs
  (it lists the routes for autocompletion). Commit it, don't edit it.

### From card to detail page

`DealCard` is now a **link**: `<v-card :to="`/deals/${deal.id}`">`. Vuetify turns
a card with `to` into a router link (an `<a href="/deals/12">` element):

- clicking changes the URL and shows the detail page **without reloading** the
  app (the store, and so the 500 deals, stay in memory);
- it works with the keyboard (Tab, Enter) like any link, so the
  `tabindex`/`role`/`@keydown` additions from step 2 are no longer needed;
- Ctrl+click or middle-click opens the deal in a new tab;
- the URL can be bookmarked or shared.

The card no longer emits any event: it doesn't need the parent anymore, the
URL carries the information ("show deal 12").

### The detail page (`pages/deals/[id].vue`)

```
URL /deals/12
  └─> route.params.id = "12"         (always TEXT)
        └─> dealId = Number("12") = 12  (ids in the data are NUMBERS; 12 === "12" is false)
              └─> deal = dealsStore.getDealById(12)   (getter: deals.find(d => d.id === 12))
```

`deal` is a `computed`, which is the key to the **two ways to arrive** here:

1. **From the list:** the deals are already in the store → `deal` is found
   immediately.
2. **Directly** (bookmark, shared link, F5 on the page): the app has just
   started, the store is **empty**. `onMounted` calls `fetchDeals()`, the page
   shows a spinner (`dealsStore.isLoading`), and when the data arrives `deal`
   recalculates **by itself** and the page appears. No `await`, no manual
   refresh: reactivity does it.

States of the page, in order: loading → offline and not in the sample data
(Retry) → not found (`/deals/99999`, `/deals/abc`: `Number('abc')` is `NaN`,
which matches nothing) → the deal.

**Why not `GET /deals/:id`?** On a direct visit, loading the full list (5
requests) means that when the user goes back to the list, it's already there,
filters work, and there is one single way data enters the app
(`fetchDeals()`). Fetching only `/deals/12` would be lighter for that one page
but would need a second loading path and a second set of states.

**The store guard against double downloads:** `fetchDeals()` now also returns
early `if (this.isLoading)`. Without it, the list and detail page could both start
a download at the same time.

### Going back to the list

The goal: when you come back from a deal, the list should be **exactly as you
left it**: same filters, same page of results, same scroll position.

| What | How it survives |
|---|---|
| Filters | already in the Pinia store, which lives as long as the app (not as long as a page) |
| Page of results | `currentPage` **moved from the list page to the store** (the list component is destroyed when you open a deal, its local variables are lost) |
| Scroll position | `scrollBehavior` in `router/index.js`: on Back/Forward the browser gives a `savedPosition` and we return to it; on a normal link click we go to the top |

**"Back to deals" button:** `router.back()` acts exactly like the browser's Back
button, so the scroll position is restored. But if the page was opened directly
(nothing before it), going back would leave the app. Vue Router stores the
previous address in `window.history.state.back`: if it exists → `router.back()`,
otherwise → `router.push('/')`.

**"All deals from <store>":** the store action `filterByStore(name)` sets the
filter **and** puts `currentPage` back to 1 (the list's `watch` can't do it:
the list page isn't mounted at that moment), then `router.push('/')`.

The app title in the top bar is also a link to `/`.

### History mode and hosting (Vercel)

The router uses `createWebHistory`: clean URLs like `/deals/12`. That address
doesn't exist as a file on the server: there's only `index.html` and the
JavaScript. The app (Vue Router) is what understands `/deals/12`.

- Clicking links inside the app is fine: the browser never asks the server.
- But opening `/deals/12` directly or pressing F5 asks the **server** for that
  path. `npm run dev` / `npm run preview` answer every path with the app, so it
  works locally. **Vercel doesn't by default** and would show a 404.
- `vercel.json` (project root) fixes it with a **rewrite**: any path that is
  not a real file is answered with `index.html`, then Vue Router reads the URL
  and shows the right page. Real files (JS, CSS, images) are still served
  normally.

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

(GitHub Pages can't do rewrites; there the alternative is
`createWebHashHistory`, with URLs like `/#/deals/12`.)

**Vercel deploys what is on GitHub**, not what is on your computer: commit
**and push** to see changes online.

### Questions a teacher might ask (step 3)

**What's the difference between `useRoute()` and `useRouter()`?**
`useRoute()` = the *current* location (path, `params`, `query`): you read it.
`useRouter()` = the router object: you use it to *navigate* (`push`, `back`).

**Why `Number(route.params.id)`?** URL parameters are always strings; the
deal ids are numbers. `find(d => d.id === "12")` would never match.

**What happens if I refresh on a deal page?** The whole app restarts, the
store is empty, the page loads the deals itself and shows the deal (see "two
ways to arrive").

**Why is `currentPage` in the store now, when step 1 said UI state stays in the
page?** The rule is "state lives where it needs to live". It was only needed
by the list, but it also needs to **outlive** the list component, which is
destroyed on navigation. The store outlives every page.

**Why `push('/')` and not `back()` for "All deals from <store>"?** The user
wants a *new* view of the list (filtered, page 1, top of the page), not to
return to the previous one.

---

## 9. Step 4: course naming conventions and styling

### Names aligned with the course (devjs.ch)

| Before | Now (course convention) |
|---|---|
| `src/services/api.js` | `src/plugins/axios.js` (the shared axios instance + API functions) |
| `.env`: `VITE_API_BASE_URL` | `VITE_API_URL` |
| store state `loading` | `isLoading` |
| store getter `dealById(id)` | `getDealById(id)` |
| store action `loadDeals()` | `fetchDeals()` |

Only names changed; the behaviour is identical.

### Styling: three tools, from simplest to most specific

1. **Vuetify props**: most of the look comes from props, no CSS at all:
   `variant="flat"` (no shadow), `border` (thin border in the theme's colour),
   `rounded="lg"` (rounded corners), `flat` + `border="b"` on the app bar.
2. **Vuetify utility classes**: spacing and text: `mt-6`, `mb-1`,
   `text-medium-emphasis`, `font-weight-bold`...
3. **`<style scoped>` in a component** for what props can't do (hover
   animation, 2-line titles). `scoped` means the CSS only applies to that
   component: Vue adds a unique attribute (`data-v-xxxx`) to the component's
   HTML and to the selectors, so class names can't clash between components.

**Why no hard-coded colours?** The theme is `system`: dark if the computer is
in dark mode, light otherwise. Props like `border` and the default bar colour
use the theme's colours, so everything adapts to both modes automatically.

### `DealCard.vue` styles

- **Hover**: `transform: translateY(-4px)` lifts the card and `box-shadow`
  adds a soft shadow; `transition` animates both over 0.2 s.
- **Image zoom**: `:deep(.v-img__img)`. The `<img>` is created *inside* the
  `v-img` component, so it doesn't receive our scoped attribute and a normal
  scoped selector can't reach it. `:deep()` lets a scoped rule target an
  element inside a child component.
- **`flex-shrink: 0` on the image**: the card is a flex column; when a title
  took 2 lines, the image was allowed to shrink and became shorter than its
  neighbours. Now it keeps its 140 px.
- **2-line titles**: `-webkit-line-clamp: 2` cuts long titles with "…", and
  `min-height` keeps every title 2 lines tall, so prices line up across a row.
  The full title is still visible on hover (`:title`) and on the detail page.
- **`@media (prefers-reduced-motion: reduce)`**: users who asked their system
  for less motion get no animation (accessibility).
