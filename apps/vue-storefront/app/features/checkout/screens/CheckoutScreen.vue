<script setup lang="ts">
import { computed, ref, type Component } from "vue"

import { Alert, Button, Icon, Skeleton, Stepper, Typography } from "@okkly/vue"

import OrderSummary from "../components/OrderSummary.vue"
import DeliveryStep from "../components/steps/DeliveryStep.vue"
import PaymentStep from "../components/steps/PaymentStep.vue"
import ReviewStep from "../components/steps/ReviewStep.vue"
import ShippingStep from "../components/steps/ShippingStep.vue"
import type { CheckoutStep } from "../constants"
import { useCheckoutPage } from "../useCheckoutPage"

const STEP_COMPONENTS: Record<CheckoutStep, Component> = {
  shipping: ShippingStep,
  delivery: DeliveryStep,
  payment: PaymentStep,
  review: ReviewStep,
}

const ACTION_LABELS: Record<CheckoutStep, string> = {
  shipping: "Continue to delivery",
  delivery: "Continue to payment",
  payment: "Continue to review",
  review: "Place order",
}

const {
  cart,
  cartIsPending,
  cartIsError,
  cartError,
  cartRefetch,
  step,
  stepperSteps,
  activeStepIndex,
  isEmpty,
} = useCheckoutPage()

const activeComponent = computed(() => STEP_COMPONENTS[step.value])

type ActiveStep = { submit: () => unknown; isPending: boolean }
const activeStepRef = ref<ActiveStep | null>(null)

const shippingAmount = computed(() =>
  (cart.value?.shipping_methods?.length ?? 0) > 0
    ? (cart.value?.shipping_total ?? 0)
    : null
)
</script>

<template>
  <section class="checkout-screen">
    <Alert v-if="cartIsError" severity="danger" class="checkout-screen__alert">
      <template #title>Checkout could not be loaded</template>
      {{
        cartError?.message ?? "Something went wrong while contacting the store."
      }}
      <template #action>
        <Button variant="soft" size="small" @click="cartRefetch()">
          <template #start-icon>
            <Icon name="iconRefreshCw" font-size="small" />
          </template>
          Retry
        </Button>
      </template>
    </Alert>

    <div v-else-if="cartIsPending" class="checkout-screen__loading">
      <Skeleton variant="text" width="20rem" height="2rem" />
      <Skeleton variant="rectangular" height="20rem" />
    </div>

    <div v-else-if="isEmpty" class="checkout-screen__empty">
      <Icon name="iconShoppingCart" font-size="large" />
      <Typography variant="label-md">Your cart is empty</Typography>
      <Typography variant="body-sm" color="muted" align="center">
        Add something to your cart before checking out.
      </Typography>
      <Button href="/" variant="soft" size="small">Back to shop</Button>
    </div>

    <template v-else-if="cart">
      <Stepper
        :steps="stepperSteps"
        :active-step="activeStepIndex"
        alternative-label
      />

      <div class="checkout-screen__layout">
        <div class="checkout-screen__content">
          <component :is="activeComponent" :key="step" ref="activeStepRef" />
        </div>

        <OrderSummary
          :items="cart.items ?? []"
          :currency-code="cart.currency_code"
          :subtotal="cart.subtotal ?? 0"
          :shipping="shippingAmount"
          :total="cart.total ?? 0"
        >
          <template #action>
            <Button
              variant="primary"
              size="large"
              shape="pill"
              full-width
              :loading="activeStepRef?.isPending ?? false"
              @click="activeStepRef?.submit()"
            >
              {{ ACTION_LABELS[step] }}
              <template v-if="step !== 'review'" #end-icon>
                <Icon name="iconArrowRight" font-size="small" />
              </template>
            </Button>
          </template>
        </OrderSummary>
      </div>
    </template>
  </section>
</template>

<style scoped>
.checkout-screen {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-10);
  width: 100%;
  max-width: 80rem;
  margin: 0 auto;
}

.checkout-screen__alert {
  align-self: stretch;
}

.checkout-screen__loading {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-6);
}

.checkout-screen__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--okkly-space-2);
  padding: var(--okkly-space-16) var(--okkly-space-6);
  border: 1px dashed var(--okkly-border-subtle);
  border-radius: var(--okkly-radius-xl);
  color: var(--okkly-text-muted);
}

.checkout-screen__layout {
  display: grid;
  grid-template-columns: 1fr 22rem;
  gap: var(--okkly-space-12);
  align-items: start;
}

.checkout-screen__content {
  min-width: 0;
}

@media (max-width: 860px) {
  .checkout-screen__layout {
    grid-template-columns: 1fr;
  }
}
</style>
