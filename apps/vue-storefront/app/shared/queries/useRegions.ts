import { useQuery } from "@tanstack/vue-query"

import type { UseRegionsProps } from "~/shared/types/medusa"

/**
 * The store's regions. A region is the pricing context of every other Store
 * API call: without a `region_id`, `/store/products` returns variants with no
 * `calculated_price` at all, so a price can only be rendered once this has
 * resolved.
 *
 * Regions change about as often as the store is reconfigured, so the result is
 * held indefinitely rather than refetched per navigation.
 */
export const useRegions = (props: UseRegionsProps = {}) => {
  const sdk = useMedusa()

  const queryResult = useQuery({
    queryKey: ["regions"],
    queryFn: () => sdk.store.region.list(props.query, props.headers),
    staleTime: Infinity,
  })

  return remapUseQueryResult(queryResult, "regions", null)
}
