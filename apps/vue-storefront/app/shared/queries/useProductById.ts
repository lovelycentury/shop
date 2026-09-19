import { useQuery } from "@tanstack/vue-query"
import { computed, toValue, type MaybeRefOrGetter } from "vue"

import type { UseProductByIdProps } from "~/shared/types/medusa"

/**
 * Props are accepted as a ref or getter as well as a plain object, mirroring
 * `useProducts` - a caller can hand over `() => ({ id, query: { region_id } })`
 * so the query re-runs once the id or the pricing region resolves.
 */
export const useProductById = (
  props: MaybeRefOrGetter<UseProductByIdProps>
) => {
  const sdk = useMedusa()
  const options = computed(() => toValue(props))

  const queryResult = useQuery({
    queryKey: [
      "products",
      computed(() => options.value.id),
      computed(() => options.value.query),
    ],
    queryFn: () =>
      sdk.store.product.retrieve(
        options.value.id,
        options.value.query,
        options.value.headers
      ),
    enabled: computed(() => options.value.enabled ?? true),
  })

  return remapUseQueryResult(queryResult, "product", null)
}
