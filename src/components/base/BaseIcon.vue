<template>
    <!-- shrink-0: dentro de un contenedor flex el SVG se aplastaba y salía
         deformado (llegaba a renderizarse con 0 de ancho). -->
    <svg :viewBox="viewBox" :class="`group shrink-0 ${iconClass}`" :width="width" :height="height" :fill="fill" :stroke-width="strokeWidth" :color="color">
        <path :class="`${withHover? 'group-hover:drop-shadow-svg': ''} ${classPath}`" fill-rule="evenodd" :stroke="color" :stroke-linecap="strokeLinecap" :stroke-linejoin="strokeLinejoin" :fill="fillPath" :d="d"/>
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
    // Remates del trazo. Por defecto sin poner, que es lo que hacían todos
    // los iconos hasta ahora: cambiarlo de golpe los tocaría a todos.
    strokeLinecap: {
        type: String,
        default: undefined
    },
    strokeLinejoin: {
        type: String,
        default: undefined
    },
    classPath: String,
    withHover: Boolean,
    fillPath: String
});

</script>