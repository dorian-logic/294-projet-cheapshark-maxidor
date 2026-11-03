<!--
  AppFooter.vue

  Simple footer showing where the data comes from.
-->
<template>
  <v-footer app class="text-caption text-medium-emphasis justify-center text-center">
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
  /* Same colour as the footer text instead of the browser's default link blue */
  a {
    color: inherit;
    text-underline-offset: 2px;
  }
</style>
