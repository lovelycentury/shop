<script setup lang="ts">
import { Skeleton } from "@okkly/vue"
</script>

<template>
  <!--
    Deliberately mirrors ProductCard's box model - same radius, same 4/5 media
    ratio, same body padding - so the grid does not reflow when the real cards
    replace these.
  -->
  <div class="product-card-skeleton" aria-hidden="true">
    <Skeleton variant="rectangular" class="product-card-skeleton__media" />
    <div class="product-card-skeleton__body">
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="45%" />
      <Skeleton variant="text" width="30%" />
    </div>
  </div>
</template>

<style scoped>
.product-card-skeleton {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--okkly-glass-border);
  border-radius: var(--okkly-radius-xl);
  background: var(--okkly-glass-fill);
}

.product-card-skeleton__media {
  aspect-ratio: 4 / 5;
  width: 100%;
  height: auto;
}

.product-card-skeleton__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--okkly-space-1);
  padding: var(--okkly-space-4);
}
</style>
