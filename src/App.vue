<script setup>
import { HeaderComponent, FooterComponent } from './components/index';
</script>

<template>
  <section class="font-code-sans transition-colors min-h-screen bg-gray-100 dark:bg-gray-700 px-8 md:px-16 xl:px-24 2xl:px-32">
    <HeaderComponent class="mb-6 pt-6 sticky top-0 z-20" />

    <RouterView class="min-h-[74vh] mb-4" />
    
    <FooterComponent class="py-12 mt-auto"/>
  </section>
</template>