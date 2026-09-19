<script setup lang="ts">
import { computed } from "vue"

import { Alert, Button, Icon, Skeleton, Typography } from "@okkly/vue"

import { formatPrice } from "~/features/products"

const route = useRoute()
const orderId = computed(() => String(route.query.order_id ?? ""))

const {
  order: orderResponse,
  orderIsPending,
  orderIsError,
  orderError,
} = useOrder({ id: orderId.value })

// `useOrder` hands back the raw `{ order }` envelope the Store API responds
// with, same as `useProductById` hands back `{ product }`.
const order = computed(() => orderResponse.value?.order ?? null)

const price = (amount: number, currencyCode: string) =>
  formatPrice({ amount, currencyCode, originalAmount: null })
</script>

<template>
  <section class="order-success">
    <Alert
      v-if="orderIsError || !orderId"
      severity="danger"
      class="order-success__alert"
    >
      <template #title>We couldn't find that order</template>
      {{
        orderError?.message ?? "The order link looks incomplete or has expired."
      }}
    </Alert>

    <div v-else-if="orderIsPending" class="order-success__loading">
      <Skeleton variant="text" width="16rem" height="2.5rem" />
      <Skeleton variant="rectangular" height="12rem" />
    </div>

    <template v-else-if="order">
      <div class="order-success__header">
        <span class="order-success__badge">
          <Icon name="iconCheck" font-size="large" />
        </span>
        <Typography variant="h1">Thank you for your order</Typography>
        <Typography variant="body-md" color="secondary">
          Order #{{ order.display_id }} is confirmed - a receipt has been sent
          to {{ order.email }}.
        </Typography>
      </div>

      <div class="order-success__card">
        <ul class="order-success__items">
          <li
            v-for="item in order.items ?? []"
            :key="item.id"
            class="order-success__item"
          >
            <img
              v-if="item.thumbnail"
              :src="item.thumbnail"
              :alt="item.title"
              class="order-success__item-image"
            />
            <div class="order-success__item-body">
              <Typography variant="label-md">{{ item.title }}</Typography>
              <Typography
                v-if="item.variant_title"
                variant="caption"
                color="muted"
              >
                {{ item.variant_title.replace(/\s*\/\s*/g, " · ") }} · Qty
                {{ item.quantity }}
              </Typography>
            </div>
            <Typography variant="label-md" as="span">
              {{ price(item.unit_price * item.quantity, order.currency_code) }}
            </Typography>
          </li>
        </ul>

        <hr class="order-success__divider" />

        <div class="order-success__row">
          <Typography variant="label-md">Total</Typography>
          <Typography variant="h4">{{
            price(order.total, order.currency_code)
          }}</Typography>
        </div>

        <template v-if="order.shipping_address">
          <hr class="order-success__divider" />
          <div class="order-success__address">
            <Typography variant="label-sm" color="secondary"
              >Shipping to</Typography
            >
            <Typography variant="body-sm">
              {{ order.shipping_address.first_name }}
              {{ order.shipping_address.last_name }},
              {{ order.shipping_address.address_1 }},
              {{ order.shipping_address.city }}
              {{ order.shipping_address.postal_code }},
              {{ order.shipping_address.country_code }}
            </Typography>
          </div>
        </template>
      </div>

      <Button href="/" variant="primary" size="large" shape="pill"
        >Continue shopping</Button
      >
    </template>
  </section>
</template>

<style scoped>
.order-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--okkly-space-8);
  width: 100%;
  max-width: 36rem;
  margin: 0 auto;
  text-align: center;
}

.order-success__alert {
  align-self: stretch;
  text-align: left;
}

.order-success__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--okkly-space-6);
  width: 100%;
}

.order-success__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--okkly-space-2);
}

.order-success__badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: var(--okkly-radius-full);
  background: color-mix(in srgb, var(--okkly-accent-primary) 16%, transparent);
  color: var(--okkly-accent-primary);
}

.order-success__card {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-4);
  width: 100%;
  padding: var(--okkly-space-5);
  border: 1px solid var(--okkly-border-subtle);
  border-radius: var(--okkly-radius-lg);
  background: var(--okkly-glass-fill);
  text-align: left;
}

.order-success__items {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.order-success__item {
  display: flex;
  align-items: center;
  gap: var(--okkly-space-3);
}

.order-success__item-image {
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  object-fit: cover;
  border: 1px solid var(--okkly-border-subtle);
  border-radius: var(--okkly-radius-md);
}

.order-success__item-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.order-success__divider {
  width: 100%;
  height: 1px;
  margin: 0;
  border: none;
  background: var(--okkly-border-subtle);
}

.order-success__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-success__address {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-1);
}
</style>
