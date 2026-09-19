import { useQuery } from "@tanstack/vue-query"
import { computed, toValue, type MaybeRefOrGetter } from "vue"

import type { UseShippingOptionsProps } from "~/shared/types/medusa"

/**
 * The shipping options a cart can use, priced for that cart. Props are
 * accepted as a ref or getter as well as a plain object, mirroring
 * `useProducts` - a caller can hand over `() => ({ query: { cart_id } })` so
 * the query re-runs once the cart id resolves.
 */
export const useShippingOptions = (
  props: MaybeRefOrGetter<UseShippingOptionsProps>
) => {
  const sdk = useMedusa()
  const options = computed(() => toValue(props))

  const queryResult = useQuery({
    queryKey: ["shippingOptions", computed(() => options.value.query)],
    queryFn: () =>
      sdk.store.fulfillment.listCartOptions(
        options.value.query,
        options.value.headers
      ),
    enabled: computed(() => options.value.enabled ?? true),
  })

  return remapUseQueryResult(queryResult, "shippingOptions", null)
}
