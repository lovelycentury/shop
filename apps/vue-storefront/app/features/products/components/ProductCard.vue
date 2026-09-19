<script setup lang="ts">
import { computed } from "vue"

import { Icon, Typography } from "@okkly/vue"

import type { Product } from "~/shared/types/medusa"

import {
  formatOriginalPrice,
  formatPrice,
  getProductPrice,
} from "../productPrice"

const props = defineProps<{
  product: Product
  /**
   * Cards above the fold should load their image eagerly; the rest wait.
   * Mirrors `next/image`'s `priority`.
   */
  priority?: boolean
}>()

const price = computed(() => getProductPrice(props.product))
const formattedPrice = computed(() =>
  price.value === null ? null : formatPrice(price.value)
)
const formattedOriginalPrice = computed(() =>
  price.value === null ? null : formatOriginalPrice(price.value)
)

const image = computed(
  () => props.product.thumbnail ?? props.product.images?.[0]?.url ?? null
)

const subtitle = computed(
  () => props.product.collection?.title ?? props.product.type?.value ?? null
)
</script>

<template>
  <NuxtLink :to="`/products/${product.id}`" class="product-card">
    <div class="product-card__media">
      <img
        v-if="image"
        :src="image"
        :alt="product.title"
        class="product-card__image"
        :loading="priority ? 'eager' : 'lazy'"
        decoding="async"
      />
      <!-- A product with no image still needs to fill its slot, or the row's
           cards end up different heights. -->
      <div v-else class="product-card__image-fallback" aria-hidden="true">
        <Icon name="iconImage" font-size="large" />
      </div>
    </div>

    <div class="product-card__body">
      <Typography variant="label-md" class="product-card__title">
        {{ product.title }}
      </Typography>

      <Typography
        v-if="subtitle"
        variant="caption"
        color="muted"
        no-wrap
        class="product-card__subtitle"
      >
        {{ subtitle }}
      </Typography>

      <div class="product-card__price">
        <template v-if="formattedPrice">
          <Typography
            variant="h4"
            as="span"
            :class="{ 'product-card__price-current--sale': formattedOriginalPrice }"
          >
            {{ formattedPrice }}
          </Typography>
          <Typography
            v-if="formattedOriginalPrice"
            variant="body-sm"
            color="muted"
            as="s"
          >
            {{ formattedOriginalPrice }}
          </Typography>
        </template>
        <Typography v-else variant="body-sm" color="muted" as="span">
          Price unavailable
        </Typography>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-3);
  height: 100%;
  color: inherit;
  text-decoration: none;
  transition: transform 160ms ease;
}

.product-card:hover {
  transform: translateY(-2px);
}

.product-card:focus-visible {
  outline: 2px solid var(--okkly-accent-primary);
  outline-offset: 2px;
}

.product-card__media {
  /* Only the image sits in a bordered "card" - the title and price below it
     are plain page content, not part of the boxed surface. */
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border: 1px solid var(--okkly-glass-border);
  border-radius: var(--okkly-radius-xl);
  background: var(--okkly-bg-inset);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.product-card:hover .product-card__media {
  border-color: var(--okkly-border-strong);
  box-shadow: var(--okkly-shadow-md);
}

.product-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-card__image-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--okkly-text-muted);
}

.product-card__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--okkly-space-1);
}

.product-card__title {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.product-card__subtitle {
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-card__price {
  display: flex;
  align-items: baseline;
  gap: var(--okkly-space-2);
  /* Pushed to the bottom so prices line up across a row of cards whose
     titles wrap to different numbers of lines. */
  margin-top: auto;
  padding-top: var(--okkly-space-2);
}

.product-card__price-current--sale {
  color: var(--okkly-accent-dante);
}

@media (prefers-reduced-motion: reduce) {
  .product-card {
    transition: none;
  }

  .product-card:hover {
    transform: none;
  }
}
</style>
