import { useQuery } from "@tanstack/vue-query"
import { computed } from "vue"

/**
 * The visitor's cart, created lazily on the first `addItem` rather than on
 * every page load - a browsing session that never buys anything should never
 * create a cart. `useCartId` is what makes the id (and so the cart) survive
 * across pages and reloads.
 */
export const useCurrentCart = () => {
  const sdk = useMedusa()
  const cartId = useCartId()

  const queryResult = useQuery({
    queryKey: ["cart", cartId],
    queryFn: () => sdk.store.cart.retrieve(cartId.value as string),
    enabled: computed(() => cartId.value !== null),
  })

  const { createCartMutateAsync } = useCreateCart()
  const {
    addCartLineItemMutateAsync,
    addCartLineItemIsPending,
    addCartLineItemError,
  } = useAddCartLineItem()

  const itemCount = computed(() =>
    (queryResult.data.value?.cart.items ?? []).reduce(
      (total, item) => total + item.quantity,
      0
    )
  )

  const addItem = async (variables: {
    variantId: string
    quantity: number
    regionId: string
  }) => {
    const id =
      cartId.value ??
      (await createCartMutateAsync({ region_id: variables.regionId })).cart.id

    cartId.value = id

    await addCartLineItemMutateAsync({
      cartId: id,
      body: { variant_id: variables.variantId, quantity: variables.quantity },
    })
  }

  return {
    ...remapUseQueryResult(queryResult, "cart", null),
    itemCount,
    addItem,
    addItemIsPending: addCartLineItemIsPending,
    addItemError: addCartLineItemError,
  }
}
