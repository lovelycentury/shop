import { useMutation, useQueryClient } from "@tanstack/vue-query"

import type {
  AddShippingMethodVariables,
  UseAddShippingMethodProps,
} from "~/shared/types/medusa"

export const useAddShippingMethod = (props: UseAddShippingMethodProps = {}) => {
  const sdk = useMedusa()
  const queryClient = useQueryClient()

  const mutationResult = useMutation({
    mutationFn: ({ cartId, body }: AddShippingMethodVariables) =>
      sdk.store.cart.addShippingMethod(
        cartId,
        body,
        props.query,
        props.headers
      ),
    onSuccess: (_data, { cartId }) => {
      queryClient.invalidateQueries({ queryKey: ["cart", cartId] })
    },
  })

  return remapUseMutationResult(mutationResult, "addShippingMethod")
}
