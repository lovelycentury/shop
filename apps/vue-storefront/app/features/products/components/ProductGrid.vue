<script setup lang="ts">
import type { Product } from "~/shared/types/medusa"

import ProductCard from "./ProductCard.vue"
import ProductCardSkeleton from "./ProductCardSkeleton.vue"

const props = withDefaults(
  defineProps<{
    products: Product[]
    /** Renders placeholder cards instead of the products. */
    pending?: boolean
    /** How many placeholders to draw - normally the page size. */
    skeletonCount?: number
    /** Dims the grid while a new page loads over the previous one. */
    stale?: boolean
  }>(),
  { pending: false, skeletonCount: 12, stale: false }
)

/** The first row, whichever breakpoint is in play, is worth loading eagerly. */
const PRIORITY_CARDS = 4
</script>

<template>
  <ul
    class="product-grid"
    :class="{ 'product-grid--stale': props.stale }"
    :aria-busy="props.pending || props.stale"
  >
    <template v-if="props.pending">
      <li v-for="index in props.skeletonCount" :key="`skeleton-${index}`">
        <ProductCardSkeleton />
      </li>
    </template>
    <template v-else>
      <li v-for="(product, index) in props.products" :key="product.id">
        <ProductCard :product="product" :priority="index < PRIORITY_CARDS" />
      </li>
    </template>
  </ul>
</template>

<style scoped>
.product-grid {
  display: grid;
  /* `auto-fill` rather than a breakpoint ladder: the column count follows the
     width the grid actually gets, which is what a card this size needs. */
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: var(--okkly-space-6);
  margin: 0;
  padding: 0;
  list-style: none;
  transition: opacity 160ms ease;
}

.product-grid--stale {
  opacity: 0.6;
  /* The cards shown belong to the previous page - don't let them be clicked
     while the next one is landing. */
  pointer-events: none;
}

@media (max-width: 480px) {
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: var(--okkly-space-4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .product-grid {
    transition: none;
  }
}
</style>
