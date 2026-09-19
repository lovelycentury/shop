<script setup lang="ts">
import { computed } from "vue"

import { Typography } from "@okkly/vue"

import { useCartId } from "~/features/cart"

import { useCheckoutPage } from "../../useCheckoutPage"

const { cart } = useCheckoutPage()
const cartId = useCartId()

const { completeCartMutateAsync, completeCartIsPending, completeCartError } =
  useCompleteCart()

const onSubmit = async (event?: Event) => {
  event?.preventDefault()
  if (!cart.value) return

  const result = await completeCartMutateAsync(cart.value.id)

  if (result.type === "order") {
    // The cart is spent - forget it so the next purchase starts a fresh one.
    cartId.value = null
    await navigateTo({
      path: "/order/success",
      query: { order_id: result.order.id },
    })
    return
  }

  await navigateTo({
    path: "/order/failed",
    query: { message: result.error.message },
  })
}

defineExpose({
  submit: onSubmit,
  isPending: computed(() => completeCartIsPending.value),
})
</script>

<template>
  <div class="review-step">
    <Typography variant="h2" as="h1">Review</Typography>

    <form class="review-step__form" @submit="onSubmit">
      <Typography variant="body-md" color="secondary">
        By clicking the Place order button, you confirm that you have read,
        understand and accept our Terms of Use, Terms of Sale and Returns Policy
        and acknowledge that you have read Medusa Store's Privacy Policy.
      </Typography>

      <Typography v-if="completeCartError" variant="body-sm" color="danger">
        {{ completeCartError.message }}
      </Typography>
    </form>
  </div>
</template>

<style scoped>
.review-step {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-6);
}

.review-step__form {
  display: flex;
  flex-direction: column;
  gap: var(--okkly-space-4);
}
</style>
