<template>
    <div class="relative flex gap-x-3" :class="{'mt-[1.9rem]': withMarginTop}">
      <div class="flex h-6 items-center">
        <input
          :id="name"
          :value="modelValue"
          @input="handleInput"
          :name="name"
          type="checkbox"
          :class="`h-4 w-4 rounded border-gray-300 checked:accent-blue-800  disabled:cursor-not-allowed ${inputClasses} cursor-pointer`"
          :checked="modelValue"
          :disabled="isDisabled"
        />
      </div>
      <div class="text-sm leading-6">
        <label :for="name" class="font-medium text-gray-900 cursor-pointer" :class="labelClasses">{{ inputLabel }}</label>
      </div>
    </div>
  </template>
  
  <script setup>
  import { toRefs } from 'vue';
  
  const props = defineProps({
    modelValue: Boolean,
    name: String,
    inputClasses: String,
    labelClasses: String,
    inputLabel: String,
    isDisabled: Boolean,
    withMarginTop: Boolean
  });
  const { modelValue, name, inputClasses, inputLabel } = toRefs(props);
  
  const emit = defineEmits(['update:modelValue']);
  
  const handleInput = (e) => {
    emit('update:modelValue', e.target.checked)
  }
  </script>