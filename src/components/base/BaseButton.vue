<template>
    <button
      :type="type"
      :disabled="isDisabled"
      :class="`block w-full rounded-md px-3 py-1.5 text-sm font-semibold leading-6 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 drop-shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses}`"
    >
      <slot></slot>
    </button>
  </template>
  
  <script setup>
  import { toRefs } from 'vue';
  const props = defineProps({
    type: String,
    buttonClasses: String,
    isDisabled: Boolean,
  });
  const { type } = toRefs(props);
  </script>
  
  <style scoped>
  @media (min-width: 768px) {
    button:not(.full-width) {
      max-width: 150px;
      min-width: 150px;
    }
  }
  </style>