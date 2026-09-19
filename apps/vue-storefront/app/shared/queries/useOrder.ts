import { useQuery } from "@tanstack/vue-query"

import type { UseOrderProps } from "~/shared/types/medusa"

/**
 * A single order by id - the store API allows this without authentication
 * (unlike listing orders), which is what lets a guest checkout land on an
 * order confirmation page.
 */
export const useOrder = (props: UseOrderProps) => {
  const sdk = useMedusa()

  const queryResult = useQuery({
    queryKey: ["order", props.id],
    queryFn: () =>
      sdk.store.order.retrieve(props.id, props.query, props.headers),
  })

  return remapUseQueryResult(queryResult, "order", null)
}
