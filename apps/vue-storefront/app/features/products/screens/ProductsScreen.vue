<script setup lang="ts">
import { ref } from "vue"

import { Alert, Button, Icon, Pagination, Typography } from "@okkly/vue"

import ProductGrid from "../components/ProductGrid.vue"
import {
  PRODUCTS_PAGE_SIZE,
  useProductsPage,
  type ProductsEmptyReason,
} from "../useProductsPage"

const {
  page,
  pageCount,
  total,
  items,
  isPending,
  isPlaceholder,
  isError,
  error,
  emptyReason,
  refetch,
  goToPage,
} = useProductsPage()

const EMPTY_COPY: Record<ProductsEmptyReason, string> = {
  "no-region": "The store has no region configured, so nothing can be priced.",
  "past-end": "This page is past the end of the catalogue.",
  "no-products": "This sales channel has no published products yet.",
}

const rootRef = ref<HTMLElement | null>(null)

/**
 * Paging swaps the content above the control that was just clicked, so bring
 * the top of the listing back into view. `scrollIntoView` on the heading
 * rather than `window.scrollTo`, because the app shell scrolls in its own
 * container, not the document.
 */
const onPageChange = (next: number) => {
  goToPage(next)
  rootRef.value?.scrollIntoView({ behavior: "smooth", block: "start" })
}
</script>

<template>
  <section ref="rootRef" class="products-screen">
    <header class="products-screen__header">
      <Typography variant="h2" as="h1">Products</Typography>
      <Typography
        v-if="!isPending && !isError && total > 0"
        variant="body-sm"
        color="muted"
      >
        {{ total }} {{ total === 1 ? "product" : "products" }}
      </Typography>
    </header>

    <Alert v-if="isError" severity="danger" class="products-screen__alert">
      <template #title>Products could not be loaded</template>
      {{ error?.message ?? "Something went wrong while contacting the store." }}
      <template #action>
        <Button variant="soft" size="small" @click="refetch()">
          <template #start-icon>
            <Icon name="iconRefreshCw" font-size="small" />
          </template>
          Retry
        </Button>
      </template>
    </Alert>

    <div
      v-else-if="!isPending && items.length === 0"
      class="products-screen__empty"
    >
      <Icon name="iconPackage" font-size="large" />
      <Typography variant="label-md">No products here</Typography>
      <Typography variant="body-sm" color="muted" align="center">
        {{ EMPTY_COPY[emptyReason] }}
      </Typography>
      <Button
        v-if="emptyReason === 'past-end'"
        variant="soft"
        size="small"
        @click="goToPage(1)"
      >
        Back to first page
      </Button>
    </div>

    <template v-else>
      <ProductGrid
        :products="items"
        :pending="isPending"
        :stale="isPlaceholder"
        :skeleton-count="PRODUCTS_PAGE_SIZE"
      />

      <nav
        v-if="pageCount > 1"
        class="products-screen__pagination"
        aria-label="Products pagination"
      >
        <Pagination
          :model-value="page"
          :count="pageCount"
          :disabled="isPending"
          show-first-button
          show-last-button
          @update:model-value="onPageChange"
        />
      </nav>
    </template>
  </section>
</template>

<style scoped>
.products-screen {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-6);
  width: 100%;
  max-width: 90rem;
  margin: 0 auto;
}

.products-screen__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--okkly-space-3);
}

.products-screen__alert {
  align-self: stretch;
}

.products-screen__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--okkly-space-2);
  padding: var(--okkly-space-16) var(--okkly-space-6);
  border: 1px dashed var(--okkly-border-subtle);
  border-radius: var(--okkly-radius-xl);
  color: var(--okkly-text-muted);
}

.products-screen__pagination {
  display: flex;
  justify-content: center;
  padding-top: var(--okkly-space-2);
}
</style>
