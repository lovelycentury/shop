<script setup lang="ts">
import {
  Button,
  Drawer,
  Icon,
  IconButton,
  Skeleton,
  Typography,
} from "@okkly/vue"

import { isCartOpen } from "~/shared/store/cartStore"

import CartDrawerItem from "../components/CartDrawerItem.vue"
import { useCartDrawer } from "../useCartDrawer"

const {
  items,
  itemCount,
  currencyCode,
  subtotal,
  isPending,
  setQuantity,
  removeItem,
} = useCartDrawer()

const close = () => {
  isCartOpen.value = false
}

const goToCheckout = () => {
  close()
  navigateTo("/checkout")
}
</script>

<template>
  <Drawer anchor="right" :open="isCartOpen" class="cart-drawer" @close="close">
    <header class="cart-drawer__header">
      <Typography variant="h4">Your cart ({{ itemCount }})</Typography>
      <IconButton variant="ghost" aria-label="Close cart" @click="close">
        <Icon name="iconX" font-size="small" />
      </IconButton>
    </header>
    <hr class="cart-drawer__divider" />

    <div v-if="isPending" class="cart-drawer__loading">
      <Skeleton variant="rectangular" width="4rem" height="4rem" />
      <div class="cart-drawer__loading-lines">
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="30%" />
      </div>
    </div>

    <div v-else-if="items.length === 0" class="cart-drawer__empty">
      <Icon name="iconShoppingCart" font-size="large" />
      <Typography variant="label-md">Your cart is empty</Typography>
      <Typography variant="body-sm" color="muted" align="center">
        Add something you like and it will show up here.
      </Typography>
    </div>

    <template v-else>
      <ul class="cart-drawer__list">
        <li v-for="(item, index) in items" :key="item.id">
          <CartDrawerItem
            :item="item"
            :currency-code="currencyCode"
            @update-quantity="(quantity) => setQuantity(item.id, quantity)"
            @remove="removeItem(item.id)"
          />
          <hr v-if="index < items.length - 1" class="cart-drawer__divider" />
        </li>
      </ul>

      <hr class="cart-drawer__divider" />

      <footer class="cart-drawer__footer">
        <div class="cart-drawer__subtotal-row">
          <Typography variant="label-md" color="secondary">Subtotal</Typography>
          <Typography variant="h4">{{ subtotal }}</Typography>
        </div>
        <Typography variant="caption" color="muted">
          Shipping &amp; taxes calculated at checkout
        </Typography>

        <Button
          variant="primary"
          size="large"
          shape="pill"
          full-width
          @click="goToCheckout"
        >
          Checkout
          <template #end-icon>
            <Icon name="iconArrowRight" font-size="small" />
          </template>
        </Button>
      </footer>
    </template>
  </Drawer>
</template>

<style scoped>
.cart-drawer {
  --okkly-drawer-width: 25rem;
  --okkly-drawer-border-color: var(--okkly-glass-border);
}

.cart-drawer__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 1.125rem 1.25rem;
}

.cart-drawer__divider {
  flex-shrink: 0;
  width: 100%;
  height: 1px;
  margin: 0;
  border: none;
  background: var(--okkly-border-subtle);
}

.cart-drawer__loading {
  display: flex;
  gap: 0.875rem;
  padding: var(--okkly-space-5);
}

.cart-drawer__loading-lines {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: center;
  gap: var(--okkly-space-2);
}

.cart-drawer__empty {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--okkly-space-2);
  padding: var(--okkly-space-16) var(--okkly-space-6);
  color: var(--okkly-text-muted);
}

.cart-drawer__list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--okkly-space-5);
  overflow-y: auto;
  margin: 0;
  padding: var(--okkly-space-5);
  list-style: none;
}

.cart-drawer__list li {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-5);
}

.cart-drawer__footer {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: stretch;
  gap: 0.875rem;
  padding: var(--okkly-space-5);
}

.cart-drawer__subtotal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cart-drawer__view-cart {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--okkly-radius-full);
  padding: var(--okkly-space-3) var(--okkly-space-5);
  background: none;
  cursor: pointer;
  transition: background-color 160ms ease;
}

.cart-drawer__view-cart:hover {
  background: var(--okkly-glass-fill);
}
</style>
