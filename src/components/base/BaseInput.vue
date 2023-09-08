<template>
    <div>
      <label :for="name" class="block text-sm font-medium leading-6 text-gray-900" :class="labelClasses">{{ inputLabel }}</label>
      <div>
        <input
          v-if="isAllowedEdit"
          :id="name"
          :value="modelValue"
          @input="handleInput"
          @focus="emit('focus', $event)"
          @blur="emit('blur', $event)"
          :name="name"
          :type="type"
          :placeholder="placeholder"
          :disabled="isDisabled"
          :min="min"
          :max="max"
          :step="step"
          :class="`block w-full rounded-md py-1.5 text-gray-900 shadow-md placeholder:text-gray-400 sm:text-sm sm:leading-6 px-4 disabled:bg-zinc-200/50 disabled:text-zinc-400 disabled:cursor-not-allowed ring-gray-300 ring-1 ring-inset focus:ring-1 focus:ring-inset focus:ring-primary-color focus:outline-none ${inputClasses}`"
        >
        <span v-else>{{ modelValue }}</span>
      </div>
    </div>
  </template>
  
  <script setup>
  import { toRefs } from 'vue';
  const props = defineProps({
    inputClasses: String,
    inputLabel: String,
    isDisabled: Boolean,
    isAllowedEdit: Boolean,
    labelClasses: String,
    modelValue: [String, Number],
    name: String,
    placeholder: String,
    type: String,
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 9999999999
    },
    step: String
  });
  const { modelValue, type, name, inputClasses, inputLabel, isDisabled } = toRefs(props);
  const emit = defineEmits(['update:modelValue', 'focus', 'blur'])
  const handleInput = (e) => {
    emit('update:modelValue', e.target.value)
  }
  </script>
  
  <style scoped>
  .input-icon{
    position: absolute;
  }
  </style>