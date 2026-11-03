<!--
  App.vue

  The root component: everything else is displayed inside it.
  It's mounted once when the app starts and never destroyed, which makes it
  the right place to prepare the store (load favorites + deals) a single time,
  whatever page the user opens first (/, /deals/12, /favorites...).
-->
<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script setup>
  import { onMounted } from 'vue'
  import { useDealsStore } from '@/stores/deals'

  const dealsStore = useDealsStore()

  onMounted(() => {
    dealsStore.init()
  })
</script>
