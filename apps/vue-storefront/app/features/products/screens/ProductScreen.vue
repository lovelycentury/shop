<script setup lang="ts">
import { computed } from "vue"

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Breadcrumbs,
  Button,
  Icon,
  Skeleton,
  Typography,
} from "@okkly/vue"

import ProductGrid from "../components/ProductGrid.vue"
import ProductGallery from "../components/ProductGallery.vue"
import { swatchColor } from "../optionSwatch"
import { formatOriginalPrice, formatPrice } from "../productPrice"
import { useProductPage } from "../useProductPage"

const {
  product,
  isPending,
  isError,
  error,
  refetch,
  colorOptions,
  sizeOptions,
  selectedColor,
  selectedSize,
  isSizeAvailable,
  price,
  quantity,
  canAddToCart,
  addToCart,
  addToCartIsPending,
  relatedProducts,
} = useProductPage()

const eyebrow = computed(
  () => product.value?.collection?.title ?? product.value?.type?.value ?? null
)

const formattedPrice = computed(() =>
  price.value === null ? null : formatPrice(price.value)
)
const formattedOriginalPrice = computed(() =>
  price.value === null ? null : formatOriginalPrice(price.value)
)

const detailsText = computed(() => {
  const parts: string[] = []

  if (product.value?.material) parts.push(`Material: ${product.value.material}`)
  if (product.value?.weight) parts.push(`Weight: ${product.value.weight}g`)

  return parts.length > 0
    ? parts.join(" · ")
    : "No additional care details are listed for this product yet."
})
</script>

<template>
  <section class="product-screen">
    <Breadcrumbs
      v-if="product"
      :items="[{ label: 'All products', href: '/' }, { label: product.title }]"
    />

    <Alert v-if="isError" severity="danger" class="product-screen__alert">
      <template #title>This product could not be loaded</template>
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

    <div v-else-if="isPending" class="product-screen__layout">
      <Skeleton variant="rectangular" class="product-screen__loading-media" />
      <div class="product-screen__loading-info">
        <Skeleton variant="text" width="20%" />
        <Skeleton variant="text" width="55%" height="2.5rem" />
        <Skeleton variant="text" width="15%" />
        <Skeleton variant="text" width="95%" />
        <Skeleton variant="text" width="80%" />
      </div>
    </div>

    <template v-else-if="product">
      <div class="product-screen__layout">
        <ProductGallery :product="product" />

        <div class="product-screen__info">
          <Typography v-if="eyebrow" variant="overline" color="accent" as="p">
            {{ eyebrow }}
          </Typography>

          <Typography variant="h1">{{ product.title }}</Typography>

          <div v-if="formattedPrice" class="product-screen__price">
            <Typography variant="h4" as="span">{{ formattedPrice }}</Typography>
            <Typography
              v-if="formattedOriginalPrice"
              variant="body-sm"
              color="muted"
              as="s"
            >
              {{ formattedOriginalPrice }}
            </Typography>
          </div>

          <Typography
            v-if="product.description"
            variant="body-md"
            color="secondary"
          >
            {{ product.description }}
          </Typography>

          <hr class="product-screen__divider" />

          <div
            v-if="colorOptions.length > 0"
            class="product-screen__option-block"
          >
            <Typography variant="label-sm" color="secondary">
              Color · {{ selectedColor }}
            </Typography>
            <div class="product-screen__swatches">
              <button
                v-for="option in colorOptions"
                :key="option.id"
                type="button"
                class="product-screen__swatch"
                :class="{
                  'product-screen__swatch--selected':
                    option.value === selectedColor,
                }"
                :aria-pressed="option.value === selectedColor"
                :aria-label="option.value"
                @click="selectedColor = option.value"
              >
                <span
                  class="product-screen__swatch-fill"
                  :style="{ backgroundColor: swatchColor(option.value) }"
                />
              </button>
            </div>
          </div>

          <div
            v-if="sizeOptions.length > 0"
            class="product-screen__option-block"
          >
            <Typography variant="label-sm" color="secondary">
              Size · {{ selectedSize }}
            </Typography>
            <div class="product-screen__sizes">
              <button
                v-for="option in sizeOptions"
                :key="option.id"
                type="button"
                class="product-screen__size"
                :class="{
                  'product-screen__size--selected':
                    option.value === selectedSize,
                  'product-screen__size--unavailable': !isSizeAvailable(
                    option.value
                  ),
                }"
                :disabled="!isSizeAvailable(option.value)"
                :aria-pressed="option.value === selectedSize"
                @click="selectedSize = option.value"
              >
                {{ option.value }}
              </button>
            </div>
          </div>

          <div class="product-screen__cart-row">
            <div
              class="product-screen__quantity"
              role="group"
              aria-label="Quantity"
            >
              <button
                type="button"
                class="product-screen__quantity-btn"
                :disabled="quantity <= 1"
                aria-label="Decrease quantity"
                @click="quantity = Math.max(1, quantity - 1)"
              >
                <Icon name="iconMinus" font-size="small" />
              </button>
              <span class="product-screen__quantity-value">{{ quantity }}</span>
              <button
                type="button"
                class="product-screen__quantity-btn"
                aria-label="Increase quantity"
                @click="quantity += 1"
              >
                <Icon name="iconPlus" font-size="small" />
              </button>
            </div>

            <Button
              variant="primary"
              size="large"
              shape="pill"
              full-width
              :disabled="!canAddToCart"
              :loading="addToCartIsPending"
              @click="addToCart()"
            >
              Add to cart
              <template #end-icon>
                <Icon name="iconArrowRight" font-size="small" />
              </template>
            </Button>
          </div>

          <hr class="product-screen__divider" />

          <div class="product-screen__accordions">
            <Accordion>
              <AccordionSummary>Details &amp; care</AccordionSummary>
              <AccordionDetails>
                <Typography variant="body-sm" color="secondary">
                  {{ detailsText }}
                </Typography>
              </AccordionDetails>
            </Accordion>
            <Accordion>
              <AccordionSummary>Shipping &amp; returns</AccordionSummary>
              <AccordionDetails>
                <Typography variant="body-sm" color="secondary">
                  Ships in 1-3 business days. Items can be returned within 30
                  days of delivery for a full refund.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </div>
        </div>
      </div>

      <div v-if="relatedProducts.length > 0" class="product-screen__related">
        <Typography variant="h2" as="h2" gutter-bottom>
          You may also like
        </Typography>
        <ProductGrid :products="relatedProducts" />
      </div>
    </template>
  </section>
</template>

<style scoped>
.product-screen {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-10);
  width: 100%;
  max-width: 90rem;
  margin: 0 auto;
}

.product-screen__alert {
  align-self: stretch;
}

.product-screen__layout {
  display: grid;
  grid-template-columns: 22.5rem 1fr;
  gap: var(--okkly-space-12);
  align-items: start;
}

.product-screen__loading-media {
  aspect-ratio: 360 / 421;
  width: 100%;
  height: auto;
}

.product-screen__loading-info {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-4);
  padding-top: var(--okkly-space-2);
}

.product-screen__info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--okkly-space-5);
}

.product-screen__price {
  display: flex;
  align-items: baseline;
  gap: var(--okkly-space-2);
}

.product-screen__divider {
  width: 100%;
  height: 1px;
  margin: 0;
  border: none;
  background: var(--okkly-border-subtle);
}

.product-screen__option-block {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.product-screen__swatches {
  display: flex;
  gap: 0.625rem;
}

.product-screen__swatch {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1.5px solid transparent;
  border-radius: var(--okkly-radius-full);
  padding: 0;
  background: none;
  cursor: pointer;
}

.product-screen__swatch--selected {
  border-color: var(--okkly-accent-primary);
}

.product-screen__swatch-fill {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--okkly-radius-full);
  border: 1px solid var(--okkly-border-subtle);
  background-color: var(--okkly-text-muted);
}

.product-screen__sizes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}

.product-screen__size {
  border: 1px solid var(--okkly-border-default);
  border-radius: var(--okkly-radius-full);
  padding: 0.4375rem 0.875rem;
  background: none;
  color: var(--okkly-text-primary);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: var(--okkly-font-weight-medium);
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.product-screen__size--selected {
  border: 1.5px solid var(--okkly-accent-primary);
  background: color-mix(in srgb, var(--okkly-accent-primary) 16%, transparent);
  color: var(--okkly-accent-primary);
}

.product-screen__size--unavailable {
  opacity: 0.35;
  cursor: not-allowed;
}

.product-screen__cart-row {
  display: flex;
  align-items: center;
  gap: var(--okkly-space-3);
  width: 100%;
}

.product-screen__quantity {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  border: 1px solid var(--okkly-border-default);
  border-radius: var(--okkly-radius-md);
  overflow: hidden;
}

.product-screen__quantity-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--okkly-space-2);
  border: none;
  background: none;
  color: var(--okkly-text-primary);
  cursor: pointer;
}

.product-screen__quantity-btn:hover:not(:disabled) {
  background: var(--okkly-glass-fill);
}

.product-screen__quantity-btn:disabled {
  color: var(--okkly-text-muted);
  cursor: not-allowed;
}

.product-screen__quantity-value {
  min-width: 1.5rem;
  padding: 0 var(--okkly-space-1);
  text-align: center;
  font-size: 0.8125rem;
  font-weight: var(--okkly-font-weight-medium);
  color: var(--okkly-text-primary);
}

.product-screen__accordions {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  width: 100%;
}

.product-screen__related {
  display: flex;
  flex-direction: column;
}

@media (max-width: 860px) {
  .product-screen__layout {
    grid-template-columns: 1fr;
  }
}
</style>
