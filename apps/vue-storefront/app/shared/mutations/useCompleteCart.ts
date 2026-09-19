import { useMutation, useQueryClient } from "@tanstack/vue-query"

import type { UseCompleteCartProps } from "~/shared/types/medusa"

export const useCompleteCart = (props: UseCompleteCartProps = {}) => {
  const sdk = useMedusa()
  const queryClient = useQueryClient()

  const mutationResult = useMutation({
    mutationFn: (cartId: string) =>
      sdk.store.cart.complete(cartId, props.query, props.headers),
    onSuccess: (_data, cartId) => {
      queryClient.invalidateQueries({ queryKey: ["cart", cartId] })
    },
  })

  return remapUseMutationResult(mutationResult, "completeCart")
}
