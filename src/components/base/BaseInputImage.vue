<template>
    <div class="container">
        <label :for="name" class="block text-sm font-medium leading-6 text-gray-900 mb-3" :class="labelClasses">{{ inputLabel }}</label>
        <div class="cursor-pointer">
            <div v-if="picture" class="image-container">
                <img
                    :src="picture"
                    alt="logo"
                    class="w-32 h-32 image object-cover"
                >
                <div v-if="!isDisabled" class="absolute top-8 left-28 ml-2 p-3">
                    <base-icon
                        color="#000"
                        width="24px"
                        height="24px"
                        icon-class="cursor-pointer"
                        :stroke-width="1.5"
                        d="M14.363 5.652l1.48-1.48a2 2 0 012.829 0l1.414 1.414a2 2 0 010 2.828l-1.48 1.48m-4.243-4.242l-9.616 9.615a2 2 0 00-.578 1.238l-.242 2.74a1 1 0 001.084 1.085l2.74-.242a2 2 0 001.24-.578l9.615-9.616m-4.243-4.242l4.243 4.242"
                    />
                </div>
            </div>
            <div v-else class="border border-gray-400 border-dashed rounded w-full h-32 flex flex-wrap justify-center items-center">
                <span class="w-full flex justify-center items-center">
                    <base-icon
                        v-show="!picture"
                        :color="isDisabled? '#ccc' : '#666'"
                        width="50px"
                        height="50px"
                        :stroke-width="1.5"
                        d="M12 22v-9m0 0l3.5 3.5M12 13l-3.5 3.5M20 17.607c1.494-.585 3-1.918 3-4.607 0-4-3.333-5-5-5 0-2 0-6-6-6S6 6 6 8c-1.667 0-5 1-5 5 0 2.689 1.506 4.022 3 4.607"
                    />
                    <span :class="`ml-2 ${isDisabled? 'text-gray-400' : 'text-gray-800' }`">{{ $t('uploadImage') }}</span>
                </span>
            </div>
        </div>

        <input
            :id="name"
            @change="handlePreview"
            :name="name"
            type="file"
            :disabled="isDisabled"
            :accept="allowedTypes"
            :class="`input-hide ${inputClasses}`"
        >
    </div>
</template>
  
<script setup>
    import { ref } from 'vue';
    import { BaseIcon } from '../index';

    defineProps({
        allowedTypes: {
            type: String,
            default: 'image/jpeg, image/png'
        },
        inputClasses: {
            type: String,
            default: ''
        },
        inputLabel: String,
        isDisabled: Boolean,
        labelClasses: String,
        picture: String,
        name: String,
    });

    const picturePreview = ref(null);

    const emit = defineEmits(['imageChanged']);

    const handlePreview = async(event) => {
        const file = event.target.files[0]

        if (file) {
            picturePreview.value = URL.createObjectURL(file)

            emit('imageChanged', { file })
        } 
    }
</script>

<style>
    .container {
        position: relative;
    }
    input.input-hide {
        cursor: pointer;
        opacity: 0;
        position: absolute;
        top: 30%;
        width: 100%;
        height: 70%;
        left: 0;
    }
</style>