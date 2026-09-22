# Vue.js Pokédex Application

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap, Build, and Test the Repository
- `npm install` -- takes 45 seconds to complete. NEVER CANCEL. Some deprecation warnings are expected but installation succeeds.
- `npm run lint` -- takes 5 seconds. NEVER CANCEL. TypeScript version warning is expected but linting passes.
- `npm run build` -- takes 6-7 seconds. NEVER CANCEL. Set timeout to 30+ seconds.
- `npm run dev` -- takes <1 second to start. NEVER CANCEL. Development server runs on http://localhost:3000
- `npm run preview` -- runs production preview on http://localhost:4173

### Key Commands and Timings
- **NEVER CANCEL any build or development commands** - they complete quickly but set appropriate timeouts
- **npm install**: 45 seconds (expect deprecation warnings for babel-eslint, glob, rimraf)
- **npm run build**: 6-7 seconds (produces dist/ folder with optimized assets)
- **npm run dev**: <1 second startup (Vite dev server, very fast hot reload)
- **npm run lint**: 5 seconds (ESLint with TypeScript warning but passes)

## Application Architecture

This is a Vue.js 3 Pokédex application using:
- **Vue 3** with Composition API (`<script setup>`)
- **Vuetify 3** for Material Design UI components
- **Pinia** for state management
- **Vite** as build tool and development server
- **File-based routing** with unplugin-vue-router
- **Auto-imports** for components and composables

### Project Structure
```
src/
├── components/          # Vue components (auto-imported)
│   ├── AppHeader.vue   # Main navigation header
│   └── README.md       # Component documentation
├── pages/              # File-based routing pages
│   ├── index.vue      # Home page (basic structure)
│   ├── [...path].vue  # 404 page
│   └── README.md      # Pages documentation
├── stores/            # Pinia stores for state management
│   ├── pokemonStore.js # Main Pokémon data and functionality
│   ├── authStore.js   # Authentication simulation
│   └── index.js       # Store configuration
├── plugins/           # Plugin configuration
│   ├── index.js       # Plugin registration
│   ├── vuetify.js     # Vuetify configuration
│   └── README.md      # Plugin documentation
├── styles/            # SCSS customizations
├── utils/             # Utility functions
├── App.vue            # Root component
└── main.js            # Application entry point
```

## Validation

### Manual Testing Scenarios
After making changes, ALWAYS validate these scenarios:

1. **Basic Application Load**:
   - `npm run dev`
   - Navigate to http://localhost:3000
   - Verify header shows "Pokedex" with Pokéball icon
   - Verify footer shows "2025 - Pokedex"

2. **Navigation Testing**:
   - Test 404 page by visiting http://localhost:3000/nonexistent
   - Verify 404 page shows proper error message and "Retour à l'accueil" button

3. **Data Store Validation**:
   - Check browser console for any JavaScript errors
   - Verify no network errors except expected Google Fonts blocking (harmless)

4. **Build Validation**:
   - `npm run build` (6-7 seconds)
   - Verify dist/ folder is created with assets
   - `npm run preview` and test on http://localhost:4173

### Linting and Code Quality
- ALWAYS run `npm run lint` before committing changes
- Expected warning: "TypeScript version 5.9.2 not officially supported" - this is harmless
- Fix any actual ESLint errors that appear

## Current Application State

### Implemented Features
- ✅ Basic Vue 3 + Vuetify + Pinia setup
- ✅ File-based routing with 404 handling
- ✅ Complete Pokémon store with 10 Pokémon data
- ✅ Type system with colors (14 types: Électrique, Plante, Poison, Feu, Eau, etc.)
- ✅ Authentication store (simulation)
- ✅ Responsive header with navigation
- ✅ LocalStorage integration for favorites
- ✅ Auto-import for components and Vue composables

### Pokémon Store Functionality
The `pokemonStore.js` contains full CRUD functionality:
- **State**: 10 pre-loaded Pokémon, 14 types, favorites array
- **Getters**: `getTypeById`, `getPokemonById`, `isFavorite`, `getFavorites`, `totalPokemons`
- **Actions**: `addPokemon`, `updatePokemon`, `deletePokemon`, `toggleFavorite`, `loadFavorites`
- **Persistence**: Favorites saved to localStorage automatically

### Incomplete Features (As Per README Tutorial)
The extensive README.md contains a 25-step tutorial. Current implementation is at the basic setup stage:
- ❌ No Pokémon display on home page
- ❌ No search functionality
- ❌ No favorites page
- ❌ No FAQ page  
- ❌ No Kanto map page
- ❌ No Pokémon cards component
- ❌ No detail pages
- ❌ No authentication UI

## Common Development Tasks

### Adding New Pages
1. Create `.vue` file in `src/pages/` (e.g., `Favoris.vue`)
2. Use basic template structure from existing pages
3. Auto-routing will create `/favoris` route automatically

### Working with Pokémon Data
```vue
<script setup>
import { usePokemonStore } from '@/stores/pokemonStore'

const pokemonStore = usePokemonStore()

// Access data
const allPokemon = pokemonStore.pokemons // Array of 10 Pokémon
const totalCount = pokemonStore.totalPokemons // Number: 10
const favorites = pokemonStore.getFavorites() // Array of favorite Pokémon

// Modify data
pokemonStore.toggleFavorite(pokemon) // Add/remove favorite
pokemonStore.addPokemon(newPokemon) // Add new Pokémon
</script>
```

### Working with Types
Each Pokémon has `types` array with type IDs. Get type info:
```js
const type = pokemonStore.getTypeById(1) // Returns { id: 1, name: 'Électrique', color: '#FFD700' }
```

### Adding Navigation Menu Items
In `src/components/AppHeader.vue`, add to `menuItems` array:
```js
{ title: 'Favoris', path: '/favoris', icon: 'mdi-heart' }
```

## Important Notes

- **Google Fonts Error**: Harmless error "Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector" for Google Fonts - this is expected in headless environments
- **No Formal Tests**: Project has no test framework setup - validate manually by running application
- **Educational Project**: This is a teaching project with extensive French documentation and step-by-step tutorial
- **Images**: Pokémon images expected in `/public/images/` but may not be present in basic setup
- **LocalStorage**: Favorites persist between sessions using localStorage

## Troubleshooting

### Common Issues
1. **Build Fails**: Run `npm install` first
2. **Linting Errors**: TypeScript version warning is expected, ignore
3. **Navigation 404**: Most routes not implemented yet, only `/` and 404 page work
4. **Missing Images**: Pokémon images referenced but files may not exist
5. **Console Errors**: Google Fonts blocking is harmless

### Debug Commands
```bash
# Check project status
npm run dev              # Start development server
npm run build           # Build for production  
npm run lint            # Check code quality
npm ls                  # Check installed packages
```

Always test the application manually after making changes by running it in the browser and exercising the functionality you've modified.