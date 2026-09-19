import { useQuery } from "@tanstack/vue-query"

import type { UseCartProps } from "~/shared/types/medusa"

export const useCart = (props: UseCartProps) => {
  const sdk = useMedusa()

  const queryResult = useQuery({
    queryKey: ["cart", props.id],
    queryFn: () =>
      sdk.store.cart.retrieve(props.id, props.query, props.headers),
  })

  return remapUseQueryResult(queryResult, "cart", null)
}
