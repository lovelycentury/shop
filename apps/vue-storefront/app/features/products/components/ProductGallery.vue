<script setup lang="ts">
import { computed, ref } from "vue"

import { Icon } from "@okkly/vue"

import type { Product } from "~/shared/types/medusa"

const props = defineProps<{
  product: Product
}>()

const images = computed(() => {
  const fromImages = props.product.images?.map((image) => image.url) ?? []

  if (fromImages.length > 0) return fromImages

  return props.product.thumbnail ? [props.product.thumbnail] : []
})

const activeIndex = ref(0)

const activeImage = computed(
  () => images.value[activeIndex.value] ?? props.product.thumbnail ?? null
)
</script>

<template>
  <div class="product-gallery">
    <div class="product-gallery__main">
      <img
        v-if="activeImage"
        :src="activeImage"
        :alt="product.title"
        class="product-gallery__main-image"
      />
      <div v-else class="product-gallery__main-fallback" aria-hidden="true">
        <Icon name="iconImage" font-size="large" />
      </div>
    </div>

    <div
      v-if="images.length > 1"
      class="product-gallery__thumbs"
      role="tablist"
    >
      <button
        v-for="(image, index) in images"
        :key="image"
        type="button"
        role="tab"
        class="product-gallery__thumb"
        :class="{ 'product-gallery__thumb--active': index === activeIndex }"
        :aria-selected="index === activeIndex"
        :aria-label="`Show image ${index + 1}`"
        @click="activeIndex = index"
      >
        <img :src="image" :alt="`${product.title} thumbnail ${index + 1}`" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.product-gallery {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.product-gallery__main {
  aspect-ratio: 360 / 421;
  overflow: hidden;
  border: 1px solid var(--okkly-border-subtle);
  border-radius: var(--okkly-radius-lg);
  background: var(--okkly-bg-inset);
}

.product-gallery__main-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-gallery__main-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--okkly-text-muted);
}

.product-gallery__thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}

.product-gallery__thumb {
  width: 4rem;
  height: 4rem;
  overflow: hidden;
  border: 1px solid var(--okkly-border-subtle);
  border-radius: var(--okkly-radius-md);
  padding: 0;
  background: var(--okkly-bg-inset);
  cursor: pointer;
  opacity: 0.7;
  transition:
    opacity 160ms ease,
    border-color 160ms ease;
}

.product-gallery__thumb:hover {
  opacity: 1;
}

.product-gallery__thumb--active {
  border: 2px solid var(--okkly-accent-primary);
  opacity: 1;
}

.product-gallery__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
