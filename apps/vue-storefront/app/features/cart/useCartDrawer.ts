import { computed } from "vue"

import { formatPrice } from "~/features/products"
import type { CartLineItem } from "~/shared/types/medusa"

import { useCurrentCart } from "./useCurrentCart"

/**
 * Cart data and per-line-item actions for the cart drawer - a thin layer
 * over `useCurrentCart` adding quantity/remove mutations and the formatted
 * subtotal, so the drawer itself stays presentational.
 */
export const useCartDrawer = () => {
  const { cart, cartIsPending, itemCount } = useCurrentCart()

  const cartId = computed(() => cart.value?.cart.id ?? null)
  const items = computed<CartLineItem[]>(() => cart.value?.cart.items ?? [])
  const currencyCode = computed(() => cart.value?.cart.currency_code ?? "usd")

  const subtotal = computed(() =>
    formatPrice({
      amount: cart.value?.cart.subtotal ?? 0,
      currencyCode: currencyCode.value,
      originalAmount: null,
    })
  )

  const {
    updateCartLineItemMutate,
    updateCartLineItemIsPending,
    updateCartLineItemError,
  } = useUpdateCartLineItem()
  const {
    deleteCartLineItemMutate,
    deleteCartLineItemIsPending,
    deleteCartLineItemError,
  } = useDeleteCartLineItem()

  const setQuantity = (lineItemId: string, quantity: number) => {
    if (!cartId.value || quantity < 1) return

    updateCartLineItemMutate({
      cartId: cartId.value,
      lineItemId,
      body: { quantity },
    })
  }

  const removeItem = (lineItemId: string) => {
    if (!cartId.value) return

    deleteCartLineItemMutate({ cartId: cartId.value, lineItemId })
  }

  return {
    items,
    itemCount,
    currencyCode,
    subtotal,
    isPending: cartIsPending,
    setQuantity,
    removeItem,
    isMutating: computed(
      () =>
        updateCartLineItemIsPending.value || deleteCartLineItemIsPending.value
    ),
    mutationError: computed(
      () => updateCartLineItemError.value ?? deleteCartLineItemError.value
    ),
  }
}
