<script setup>
import { HeaderComponent, SpinnerComponent } from './components/index';
</script>

<template>
  <section class="transition-colors min-h-screen bg-gray-100 dark:bg-gray-700 px-8 md:px-16 xl:px-24 2xl:px-32">
    <HeaderComponent class="mb-6 pt-6 sticky top-0 z-20" />
    
    <section v-if="isLoading" class="flex justify-center items-center w-100">
      <SpinnerComponent />
    </section>

    <RouterView v-else />
  </section>
</template>