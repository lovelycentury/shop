<script setup lang="ts">
import { computed } from "vue"

import { Icon, Typography } from "@okkly/vue"

import QuantityStepper from "~/shared/components/QuantityStepper.vue"
import type { CartLineItem } from "~/shared/types/medusa"

import { formatPrice } from "~/features/products"

const props = defineProps<{
  item: CartLineItem
  currencyCode: string
}>()

defineEmits<{
  "update-quantity": [quantity: number]
  remove: []
}>()

// Medusa joins a variant's option values with " / " (e.g. "S / White") -
// " · " is this design's own separator, matching how the product page and
// grid cards already show a variant/category line.
const variantLabel = computed(
  () => props.item.variant_title?.replace(/\s*\/\s*/g, " · ") ?? null
)

const formattedPrice = computed(() =>
  formatPrice({
    amount: props.item.unit_price,
    currencyCode: props.currencyCode,
    originalAmount: null,
  })
)
</script>

<template>
  <div class="cart-item">
    <div class="cart-item__media">
      <img
        v-if="item.thumbnail"
        :src="item.thumbnail"
        :alt="item.title"
        class="cart-item__image"
      />
      <div v-else class="cart-item__image-fallback" aria-hidden="true">
        <Icon name="iconImage" font-size="small" />
      </div>
    </div>

    <div class="cart-item__body">
      <div class="cart-item__row">
        <Typography variant="label-md" class="cart-item__title">
          {{ item.title }}
        </Typography>
        <button
          type="button"
          class="cart-item__remove"
          :aria-label="`Remove ${item.title}`"
          @click="$emit('remove')"
        >
          <Icon name="iconX" font-size="small" />
        </button>
      </div>

      <Typography v-if="variantLabel" variant="caption" color="muted">
        {{ variantLabel }}
      </Typography>

      <div class="cart-item__row">
        <Typography variant="label-md" as="span">{{
          formattedPrice
        }}</Typography>
        <QuantityStepper
          :model-value="item.quantity"
          @update:model-value="$emit('update-quantity', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-item {
  display: flex;
  gap: 0.875rem;
  width: 100%;
}

.cart-item__media {
  flex-shrink: 0;
  width: 4rem;
  height: 4rem;
  overflow: hidden;
  border: 1px solid var(--okkly-border-subtle);
  border-radius: var(--okkly-radius-lg);
  background: var(--okkly-bg-inset);
}

.cart-item__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cart-item__image-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--okkly-text-muted);
}

.cart-item__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}

.cart-item__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--okkly-space-2);
}

.cart-item__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-item__remove {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  padding: 0;
  color: var(--okkly-text-muted);
  cursor: pointer;
}

.cart-item__remove:hover {
  color: var(--okkly-text-primary);
}
</style>
