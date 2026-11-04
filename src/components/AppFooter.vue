<!--
  AppFooter.vue

  Simple footer showing where the data comes from.

  No `app` prop: with `app`, Vuetify FIXES the footer at the bottom of the
  screen, on top of the content (it hid the last row of cards). Without it,
  the footer simply comes after the page content, at the end of the page.
-->
<template>
  <v-footer border="t" class="footer text-caption text-medium-emphasis justify-center text-center py-4">
    Deals data from
    <a
      class="mx-1"
      href="https://www.cheapshark.com"
      rel="noopener noreferrer"
      target="_blank"
    >CheapShark</a>
    via the DIVTEC API — school project, module 294
  </v-footer>
</template>

<style scoped>
  /* Same colour as the page behind it, instead of a separate grey block */
  .footer {
    background: transparent;
  }

  /* Same colour as the footer text instead of the browser's default link blue */
  a {
    color: inherit;
    text-underline-offset: 2px;
  }
</style>
