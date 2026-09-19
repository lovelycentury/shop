import { keepPreviousData, useQuery } from "@tanstack/vue-query"
import { computed, toValue, type MaybeRefOrGetter } from "vue"

import type { UseProductsProps } from "~/shared/types/medusa"

/**
 * Props are accepted as a ref or getter as well as a plain object, and the
 * query params are part of the query key: a paginated caller can hand over
 * `() => ({ query: { offset: ... } })` and every page lands in its own cache
 * entry, refetched as the page changes.
 *
 * `keepPreviousData` keeps the previous page on screen while the next one
 * loads, so paging doesn't collapse the grid back to skeletons each time;
 * `productsIsPlaceholderData` tells a caller the list shown is still the old
 * one.
 */
export const useProducts = (
  props: MaybeRefOrGetter<UseProductsProps> = {}
) => {
  const sdk = useMedusa()
  const options = computed(() => toValue(props))

  const queryResult = useQuery({
    queryKey: ["products", computed(() => options.value.query)],
    queryFn: () =>
      sdk.store.product.list(options.value.query, options.value.headers),
    enabled: computed(() => options.value.enabled ?? true),
    placeholderData: keepPreviousData,
  })

  return remapUseQueryResult(queryResult, "products", null)
}
