import { useQuery } from "@tanstack/vue-query"

import type { UseProductsProps } from "~/shared/types/medusa"

export const useProducts = (props: UseProductsProps = {}) => {
  const sdk = useMedusa()

  const queryResult = useQuery({
    queryKey: ["products"],
    queryFn: () => sdk.store.product.list(props.query, props.headers),
  })

  return remapUseQueryResult(queryResult, "products", null)
}
