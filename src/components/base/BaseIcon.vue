<template>
    <!-- shrink-0: dentro de un contenedor flex el SVG se aplastaba y salía
         deformado (llegaba a renderizarse con 0 de ancho). -->
    <svg :viewBox="viewBox" :class="`group shrink-0 ${iconClass}`" :width="width" :height="height" :fill="fill" :stroke-width="strokeWidth" :color="color">
        <path :class="`${withHover? 'group-hover:drop-shadow-svg': ''} ${classPath}`" fill-rule="evenodd" :stroke="color" :fill="fillPath" :d="d"/>
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
    strokeWidth: {
        type: Number,
        default: 1.5
    },
    iconClass: {
        type: String,
        default: ''
    },
    classPath: String,
    withHover: Boolean,
    fillPath: String
});

</script>