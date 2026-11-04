/**
 * plugins/vuetify.js
 *
 * Creates Vuetify (the component library) and configures it for the whole app.
 * Framework documentation: https://vuetifyjs.com
 */

// Composables
import { createVuetify } from 'vuetify'

// Styles (imported only for their side effect: they load CSS)
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

export default createVuetify({
  theme: {
    // 'system' = follow the computer's setting (dark mode or light mode)
    defaultTheme: 'system',

    // We only override a few colours of Vuetify's built-in `light` and `dark`
    // themes; every other colour keeps its default value.
    // Three layers, from back to front, so the page doesn't look flat:
    //   background  = the page itself (darkest in dark mode)
    //   surface     = cards, filter panel, app bar (one step lighter)
    // The dark colours have a slight blue tint instead of neutral grey.
    // `free` is our own colour (for "FREE" prices): Vuetify then creates the
    // class `text-free`, with a lighter amber in dark mode and a darker one in
    // light mode, so the text stays readable on both backgrounds.
    themes: {
      dark: {
        colors: {
          background: '#0e1117',
          surface: '#171b24',
          free: '#fbbf24',
        },
      },
      light: {
        colors: {
          background: '#f3f5f9',
          surface: '#ffffff',
          free: '#b45309',
        },
      },
    },
  },

  // Default props given to EVERY component of a type, so we don't repeat them.
  // Vuetify buttons are UPPERCASE with wide letter spacing by default:
  // `text-none` keeps the text as written, and normal spacing suits it better.
  defaults: {
    VBtn: {
      class: 'text-none',
      style: 'letter-spacing: normal',
    },
  },
})
