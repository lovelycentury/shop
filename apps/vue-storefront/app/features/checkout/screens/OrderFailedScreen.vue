<script setup lang="ts">
import { computed } from "vue"

import { Button, Icon, Typography } from "@okkly/vue"

const route = useRoute()
const message = computed(() => {
  const raw = route.query.message
  return typeof raw === "string" && raw.length > 0
    ? raw
    : "Something went wrong while placing your order."
})
</script>

<template>
  <section class="order-failed">
    <span class="order-failed__badge">
      <Icon name="iconX" font-size="large" />
    </span>
    <Typography variant="h1">We couldn't place your order</Typography>
    <Typography variant="body-md" color="secondary">{{ message }}</Typography>
    <Typography variant="body-sm" color="muted">
      Your cart is untouched - nothing was charged.
    </Typography>

    <div class="order-failed__actions">
      <Button href="/checkout" variant="primary" size="large" shape="pill">
        Back to checkout
      </Button>
      <Button href="/" variant="soft" size="large" shape="pill"
        >Continue shopping</Button
      >
    </div>
  </section>
</template>

<style scoped>
.order-failed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--okkly-space-3);
  width: 100%;
  max-width: 28rem;
  margin: 0 auto;
  text-align: center;
}

.order-failed__badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: var(--okkly-space-3);
  border-radius: var(--okkly-radius-full);
  background: color-mix(in srgb, var(--okkly-feedback-danger) 16%, transparent);
  color: var(--okkly-feedback-danger);
}

.order-failed__actions {
  display: flex;
  gap: var(--okkly-space-3);
  margin-top: var(--okkly-space-4);
}
</style>
