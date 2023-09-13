<template>
    <div>
      <label v-if="inputLabel" :for="name" class="flex text-sm font-medium leading-6 text-gray-900 mb-1" :class="labelClasses">
        {{ inputLabel }}
        <base-spinner v-if="isLoading" class="ml-2 my-auto" :width="'12px'" :height="'12px'"/>
      </label>
      <div>
        <select
          :id="name"
          :name="name"
          :value="modelValue"
          @change="handleInput"
          :class="`block w-full rounded-md border-0 py-2 bg-white text-gray-900 shadow-md ring-1 ring-inset ring-gray-300 focus:ring-1 focus:ring-inset focus:ring-primary-color sm:text-sm sm:leading-6 px-4
          disabled:bg-zinc-200 disabled:text-zinc-600 disabled:cursor-not-allowed focus:outline-none
          ${selectClasses}`"
          :disabled="isDisabled || isLoading"
          >
          <option value="">
            {{ $t(isLoading? 'loadingOptions': `placeholder.${placeholder}`) }}</option>
          <option v-for="(option, index) in options" :value="option[valueKey]" :text="option[optionValue]" :key="index">
            {{ option[optionValue] }}
          </option>
        </select>
      </div>
    </div>
  </template>
  
  <script setup>
  import { BaseSpinner } from '../index';
  
  defineProps({
    modelValue: [Number, String],
    type: String,
    name: String,
    options: Object,
    selectClasses: String,
    labelClasses: String,
    inputLabel: String,
    isDisabled: Boolean,
    isLoading: { type: Boolean, default: false },
    placeholder: {
      type: String,
      default: 'selectAnOption'
    },
    optionValue: {
      type: String,
      default: 'name'
    },
    valueKey: {
      type: String,
      default: 'id'
    }
  });
  
  const emit = defineEmits(['update:modelValue'])
  const handleInput = (e) => {
    emit('update:modelValue', e.target.value)
  }
  </script>
  
  <style scoped>
  select {
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAUCAMAAACtdX32AAAAdVBMVEUAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAhMdQaAAAAJ3RSTlMAAAECAwQGBwsOFBwkJTg5RUZ4eYCHkJefpaytrsXGy8zW3+Do8vNn0bsyAAAAYElEQVR42tXROwJDQAAA0Ymw1p9kiT+L5P5HVEi3qJn2lcPjtIuzUIJ/rhIGy762N3XaThqMN1ZPALsZPEzG1x8LrFL77DHBnEMxBewz0fJ6LyFHTPL7xhwzWYrJ9z22AqmQBV757MHfAAAAAElFTkSuQmCC);
    background-position: 100%;
    background-repeat: no-repeat;
    height: 36px;
  }
  </style>