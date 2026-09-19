import { useQuery } from "@tanstack/vue-query"

import type { UseProductByIdProps } from "~/shared/types/medusa"

export const useProductById = (props: UseProductByIdProps) => {
  const sdk = useMedusa()

  const queryResult = useQuery({
    queryKey: ["products", props.id],
    queryFn: () =>
      sdk.store.product.retrieve(props.id, props.query, props.headers),
  })

  return remapUseQueryResult(queryResult, "product", null)
}
