<template>
    <svg :viewBox="viewBox" :class="`group ${iconClass}`" :width="width" :height="height" :fill="fill" :stroke-width="strokeWidth" :color="color">
        <path class="group-hover:drop-shadow-svg" :stroke="color" :d="d"/>
    </svg>
</template>
  
<script setup>
defineProps({
    width: {
        type: String,
        default: '24px'
    },
    height: {
        type: String,
        default: '24px'
    },
    color: {
        type: String,
        default: '#000'
    },
    fill: {
        type: String,
        default: 'none'
    },
    d: {
        type: String,
        required: true
    },
    viewBox: {
        type: String,
        default: '0 0 24 24'
    },
    iconClass: String,
    strokeWidth: Number,
    withHover: Boolean
});

</script>