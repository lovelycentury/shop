<script setup lang="ts">
import { computed } from "vue"

import { Icon, Typography } from "@okkly/vue"

import { formatPrice } from "~/features/products"
import type { CartLineItem } from "~/shared/types/medusa"

const props = defineProps<{
  items: CartLineItem[]
  currencyCode: string
  subtotal: number
  /** `null` while no shipping method is chosen yet - shown as "Calculated next". */
  shipping: number | null
  total: number
}>()

const variantLabel = (item: CartLineItem) =>
  item.variant_title?.replace(/\s*\/\s*/g, " · ") ?? null

const price = (amount: number) =>
  formatPrice({
    amount,
    currencyCode: props.currencyCode,
    originalAmount: null,
  })

const formattedSubtotal = computed(() => price(props.subtotal))
const formattedShipping = computed(() =>
  props.shipping === null ? "Calculated next" : price(props.shipping)
)
const formattedTotal = computed(() => price(props.total))
</script>

<template>
  <aside class="order-summary">
    <ul class="order-summary__items">
      <li v-for="item in items" :key="item.id" class="order-summary__item">
        <div class="order-summary__item-media">
          <img
            v-if="item.thumbnail"
            :src="item.thumbnail"
            :alt="item.title"
            class="order-summary__item-image"
          />
          <div v-else class="order-summary__item-fallback" aria-hidden="true">
            <Icon name="iconImage" font-size="small" />
          </div>
          <span class="order-summary__item-qty">{{ item.quantity }}</span>
        </div>
        <div class="order-summary__item-body">
          <Typography variant="label-sm" class="order-summary__item-title">
            {{ item.title }}
          </Typography>
          <Typography v-if="variantLabel(item)" variant="caption" color="muted">
            {{ variantLabel(item) }}
          </Typography>
        </div>
        <Typography
          variant="label-sm"
          as="span"
          class="order-summary__item-price"
        >
          {{ price(item.unit_price * item.quantity) }}
        </Typography>
      </li>
    </ul>

    <hr class="order-summary__divider" />

    <div class="order-summary__totals">
      <div class="order-summary__row">
        <Typography variant="body-sm" color="secondary">Subtotal</Typography>
        <Typography variant="body-sm">{{ formattedSubtotal }}</Typography>
      </div>
      <div class="order-summary__row">
        <Typography variant="body-sm" color="secondary">Shipping</Typography>
        <Typography variant="body-sm">{{ formattedShipping }}</Typography>
      </div>
      <hr class="order-summary__divider" />
      <div class="order-summary__row">
        <Typography variant="label-md">Total</Typography>
        <Typography variant="h4">{{ formattedTotal }}</Typography>
      </div>
    </div>

    <div class="order-summary__action">
      <slot name="action" />
    </div>
  </aside>
</template>

<style scoped>
.order-summary {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-4);
  width: 100%;
  padding: var(--okkly-space-5);
  border: 1px solid var(--okkly-border-subtle);
  border-radius: var(--okkly-radius-lg);
  background: var(--okkly-glass-fill);
}

.order-summary__items {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-4);
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 20rem;
  overflow-y: auto;
}

.order-summary__item {
  display: flex;
  align-items: center;
  gap: var(--okkly-space-3);
}

.order-summary__item-media {
  position: relative;
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  overflow: hidden;
  border: 1px solid var(--okkly-border-subtle);
  border-radius: var(--okkly-radius-md);
  background: var(--okkly-bg-inset);
}

.order-summary__item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-summary__item-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--okkly-text-muted);
}

.order-summary__item-qty {
  position: absolute;
  top: -0.375rem;
  right: -0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.125rem;
  height: 1.125rem;
  padding: 0 0.25rem;
  border-radius: var(--okkly-radius-full);
  background: var(--okkly-bg-surface-raised);
  border: 1px solid var(--okkly-border-default);
  font-size: 0.6875rem;
  font-weight: var(--okkly-font-weight-medium);
  color: var(--okkly-text-secondary);
}

.order-summary__item-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.order-summary__item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-summary__item-price {
  flex-shrink: 0;
}

.order-summary__divider {
  width: 100%;
  height: 1px;
  margin: 0;
  border: none;
  background: var(--okkly-border-subtle);
}

.order-summary__totals {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-2);
}

.order-summary__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-summary__action {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-2);
}
</style>
