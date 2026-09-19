<script setup lang="ts">
import { Badge, Icon, IconButton } from "@okkly/vue"

import { useCurrentCart } from "~/features/cart"
import { isCartOpen } from "~/shared/store/cartStore"

const { itemCount: cartItemCount } = useCurrentCart()
</script>

<template>
  <header class="header">
    <div class="header__bar">
      <NuxtLink to="/" class="header__brand">
        <Icon name="iconShoppingCart" font-size="small" />
        <span class="header__brand-name">MEDUSA</span>
      </NuxtLink>

      <Badge
        :badge-content="cartItemCount"
        :invisible="cartItemCount === 0"
        color="dante"
      >
        <IconButton
          variant="ghost"
          aria-label="Open cart"
          @click="isCartOpen = true"
        >
          <Icon name="iconShoppingCart" font-size="small" />
        </IconButton>
      </Badge>
    </div>
    <!--
      A plain `<hr>` styled with the design system's own Divider classes,
      rather than `<Divider>` itself: with no label slot, that component
      resolves to a bare `<hr>` but still hands it a comment-node slot
      child, which SSR drops (void element) while the client vdom keeps it
      — a hydration "children mismatch" on every page load.
    -->
    <hr class="okkly-component okkly-divider okkly-divider--horizontal" />
  </header>
</template>

<style scoped>
.header {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-6);
  padding: var(--okkly-space-16) var(--okkly-space-16) 0;
}

.header__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header__brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: var(--okkly-text-primary);
  text-decoration: none;
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.4118em;
  font-family: var(--okkly-font-family-heading);
}

@media (max-width: 768px) {
  .header {
    padding: var(--okkly-space-6) var(--okkly-space-6) 0;
  }
}
</style>
