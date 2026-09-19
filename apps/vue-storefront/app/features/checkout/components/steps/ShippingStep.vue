<script setup lang="ts">
import { computed } from "vue"
import { toTypedSchema } from "@vee-validate/zod"
import { useForm } from "vee-validate"

import { Checkbox, TextField, Typography } from "@okkly/vue"

import AddressFields from "../AddressFields.vue"
import {
  emptyAddress,
  shippingStepSchema,
  type ShippingStepValues,
} from "../../schemas"
import { useCheckoutPage } from "../../useCheckoutPage"

const { cart, countries, goToStep, cartRefetch } = useCheckoutPage()

const toFormAddress = (
  address: {
    first_name?: string | null
    last_name?: string | null
    company?: string | null
    address_1?: string | null
    postal_code?: string | null
    city?: string | null
    country_code?: string | null
    province?: string | null
  } | null
): ShippingStepValues["shippingAddress"] => ({
  firstName: address?.first_name ?? "",
  lastName: address?.last_name ?? "",
  company: address?.company ?? "",
  address1: address?.address_1 ?? "",
  postalCode: address?.postal_code ?? "",
  city: address?.city ?? "",
  countryCode: address?.country_code ?? "",
  province: address?.province ?? "",
})

const { handleSubmit, defineField, errors } = useForm<ShippingStepValues>({
  validationSchema: toTypedSchema(shippingStepSchema),
  initialValues: {
    email: cart.value?.email ?? "",
    phone: cart.value?.shipping_address?.phone ?? "",
    shippingAddress: toFormAddress(cart.value?.shipping_address ?? null),
    billingSameAsShipping: true,
    billingAddress: cart.value?.billing_address
      ? toFormAddress(cart.value.billing_address)
      : emptyAddress,
  },
})

const [email, emailAttrs] = defineField("email")
const [phone] = defineField("phone")
const [billingSameAsShipping] = defineField("billingSameAsShipping")

const { updateCartMutateAsync, updateCartIsPending, updateCartError } =
  useUpdateCart()

const mapAddress = (address: ShippingStepValues["shippingAddress"]) => ({
  first_name: address.firstName,
  last_name: address.lastName,
  company: address.company || null,
  address_1: address.address1,
  postal_code: address.postalCode,
  city: address.city,
  country_code: address.countryCode,
  province: address.province || null,
})

const onSubmit = handleSubmit(async (values) => {
  if (!cart.value) return

  await updateCartMutateAsync({
    id: cart.value.id,
    body: {
      email: values.email,
      shipping_address: {
        ...mapAddress(values.shippingAddress),
        phone: values.phone || null,
      },
      billing_address: mapAddress(
        values.billingSameAsShipping
          ? values.shippingAddress
          : values.billingAddress
      ),
    },
  })

  // The stepper's own guard reads `cart` to decide how far a visitor may
  // jump - without waiting for the refetch it would still see no address
  // and immediately bounce the navigation below back to this step.
  await cartRefetch()
  goToStep("delivery")
})

const emailErrorMessage = computed(() => errors.value.email)

defineExpose({
  submit: onSubmit,
  isPending: computed(() => updateCartIsPending.value),
})
</script>

<template>
  <div class="shipping-step">
    <Typography variant="h2" as="h1">Shipping address</Typography>

    <form class="shipping-step__form" @submit="onSubmit">
      <AddressFields prefix="shippingAddress" :countries="countries" />

      <div class="shipping-step__contact">
        <TextField
          v-model="email"
          v-bind="emailAttrs"
          type="email"
          required
          full-width
          :error="!!emailErrorMessage"
        >
          <template #label>Email</template>
          <template v-if="emailErrorMessage" #helper-text>{{
            emailErrorMessage
          }}</template>
        </TextField>
        <TextField v-model="phone" type="tel" full-width>
          <template #label>Phone</template>
        </TextField>
      </div>

      <Checkbox v-model="billingSameAsShipping">
        <template #label>Billing address same as shipping address</template>
      </Checkbox>

      <template v-if="!billingSameAsShipping">
        <Typography variant="label-md">Billing address</Typography>
        <AddressFields prefix="billingAddress" :countries="countries" />
      </template>

      <Typography v-if="updateCartError" variant="body-sm" color="danger">
        {{ updateCartError.message }}
      </Typography>
    </form>
  </div>
</template>

<style scoped>
.shipping-step {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-6);
}

.shipping-step__form {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--okkly-space-5);
}

.shipping-step__contact {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--okkly-space-4);
  width: 100%;
}

@media (max-width: 640px) {
  .shipping-step__contact {
    grid-template-columns: 1fr;
  }
}
</style>
