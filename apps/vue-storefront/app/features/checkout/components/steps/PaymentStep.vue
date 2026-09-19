<script setup lang="ts">
import { computed } from "vue"

import { Icon, Radio, Typography } from "@okkly/vue"

import { MANUAL_PAYMENT_PROVIDER_ID } from "../../constants"
import { useCheckoutPage } from "../../useCheckoutPage"

const PROVIDER_LABELS: Record<string, string> = {
  [MANUAL_PAYMENT_PROVIDER_ID]: "Manual Payment",
}

const { cart, goToStep, cartRefetch } = useCheckoutPage()

const { paymentProviders } = usePaymentProviders({
  query: { region_id: cart.value?.region_id ?? "" },
})

const providers = computed(
  () => paymentProviders.value?.payment_providers ?? []
)

const {
  createPaymentSessionMutateAsync,
  createPaymentSessionIsPending,
  createPaymentSessionError,
} = useCreatePaymentSession()

const onSubmit = async (event?: Event) => {
  event?.preventDefault()
  if (!cart.value) return

  await createPaymentSessionMutateAsync({
    cart: cart.value,
    body: { provider_id: MANUAL_PAYMENT_PROVIDER_ID },
  })

  await cartRefetch()
  goToStep("review")
}

defineExpose({
  submit: onSubmit,
  isPending: computed(() => createPaymentSessionIsPending.value),
})
</script>

<template>
  <div class="payment-step">
    <Typography variant="h2" as="h1">Payment</Typography>

    <form class="payment-step__form" @submit="onSubmit">
      <label
        v-for="provider in providers"
        :key="provider.id"
        class="payment-option payment-option--selected"
      >
        <Radio :checked="true" :value="provider.id" />
        <Typography variant="label-md">
          {{ PROVIDER_LABELS[provider.id] ?? provider.id }}
        </Typography>
        <span class="payment-option__notice"
          >Attention: For testing purposes only.</span
        >
        <Icon
          name="iconCreditCard"
          font-size="small"
          class="payment-option__icon"
        />
      </label>

      <Typography
        v-if="createPaymentSessionError"
        variant="body-sm"
        color="danger"
      >
        {{ createPaymentSessionError.message }}
      </Typography>
    </form>
  </div>
</template>

<style scoped>
.payment-step {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-6);
}

.payment-step__form {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-3);
}

.payment-option {
  display: flex;
  align-items: center;
  gap: var(--okkly-space-3);
  padding: var(--okkly-space-4);
  border: 1px solid var(--okkly-accent-primary);
  border-radius: var(--okkly-radius-lg);
  cursor: default;
}

.payment-option__notice {
  padding: 0.25rem 0.625rem;
  border-radius: var(--okkly-radius-full);
  background: color-mix(
    in srgb,
    var(--okkly-feedback-warning) 16%,
    transparent
  );
  color: var(--okkly-feedback-warning);
  font-size: 0.8125rem;
  font-weight: var(--okkly-font-weight-medium);
}

.payment-option__icon {
  margin-left: auto;
  color: var(--okkly-text-muted);
}
</style>
