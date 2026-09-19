<script setup lang="ts">
import { computed, watch } from "vue"
import { toTypedSchema } from "@vee-validate/zod"
import { useForm } from "vee-validate"

import { Radio, RadioGroup, Skeleton, Typography } from "@okkly/vue"

import { formatPrice } from "~/features/products"

import { deliveryStepSchema } from "../../schemas"
import { useCheckoutPage } from "../../useCheckoutPage"

const { cart, goToStep, cartRefetch } = useCheckoutPage()

const { shippingOptions, shippingOptionsIsPending } = useShippingOptions(
  () => ({
    query: { cart_id: cart.value?.id ?? "" },
    enabled: cart.value?.id !== undefined,
  })
)

const options = computed(() => shippingOptions.value?.shipping_options ?? [])

const { handleSubmit, defineField, setFieldValue } = useForm({
  validationSchema: toTypedSchema(deliveryStepSchema),
  initialValues: {
    shippingOptionId:
      cart.value?.shipping_methods?.[0]?.shipping_option_id ?? "",
  },
})

const [shippingOptionId] = defineField("shippingOptionId")

// Nothing is pre-selected until the options arrive - default to the first
// one once they do, rather than leaving the visitor to fill in an obvious
// choice by hand.
watch(
  options,
  (value) => {
    const first = value[0]

    if (!shippingOptionId.value && first) {
      setFieldValue("shippingOptionId", first.id)
    }
  },
  { immediate: true }
)

const {
  addShippingMethodMutateAsync,
  addShippingMethodIsPending,
  addShippingMethodError,
} = useAddShippingMethod()

const onSubmit = handleSubmit(async (values) => {
  if (!cart.value) return

  await addShippingMethodMutateAsync({
    cartId: cart.value.id,
    body: { option_id: values.shippingOptionId },
  })

  await cartRefetch()
  goToStep("payment")
})

defineExpose({
  submit: onSubmit,
  isPending: computed(() => addShippingMethodIsPending.value),
})
</script>

<template>
  <div class="delivery-step">
    <Typography variant="h2" as="h1">Delivery</Typography>

    <form class="delivery-step__form" @submit="onSubmit">
      <div class="delivery-step__intro">
        <Typography variant="label-md">Shipping method</Typography>
        <Typography variant="body-sm" color="muted">
          How would you like your order delivered
        </Typography>
      </div>

      <div v-if="shippingOptionsIsPending" class="delivery-step__options">
        <Skeleton variant="rectangular" height="4.5rem" />
        <Skeleton variant="rectangular" height="4.5rem" />
      </div>

      <RadioGroup
        v-else
        v-model="shippingOptionId"
        class="delivery-step__options"
      >
        <label
          v-for="option in options"
          :key="option.id"
          class="delivery-option"
          :class="{
            'delivery-option--selected': option.id === shippingOptionId,
          }"
        >
          <Radio :value="option.id" />
          <Typography variant="label-md" class="delivery-option__name">
            {{ option.name }}
          </Typography>
          <Typography variant="label-md" as="span">
            {{
              formatPrice({
                amount: option.calculated_price?.calculated_amount ?? 0,
                currencyCode: cart?.currency_code ?? "usd",
                originalAmount: null,
              })
            }}
          </Typography>
        </label>
      </RadioGroup>

      <Typography
        v-if="addShippingMethodError"
        variant="body-sm"
        color="danger"
      >
        {{ addShippingMethodError.message }}
      </Typography>
    </form>
  </div>
</template>

<style scoped>
.delivery-step {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-6);
}

.delivery-step__form {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-4);
}

.delivery-step__intro {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-1);
}

.delivery-step__options {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-3);
}

.delivery-option {
  display: flex;
  align-items: center;
  gap: var(--okkly-space-3);
  padding: var(--okkly-space-4);
  border: 1px solid var(--okkly-border-default);
  border-radius: var(--okkly-radius-lg);
  cursor: pointer;
  transition: border-color 160ms ease;
}

.delivery-option--selected {
  border-color: var(--okkly-accent-primary);
}

.delivery-option__name {
  flex: 1 1 auto;
}
</style>
