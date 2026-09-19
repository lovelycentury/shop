import { useMutation, useQueryClient } from "@tanstack/vue-query"

import type {
  UpdateCartLineItemVariables,
  UseUpdateCartLineItemProps,
} from "~/shared/types/medusa"

export const useUpdateCartLineItem = (
  props: UseUpdateCartLineItemProps = {}
) => {
  const sdk = useMedusa()
  const queryClient = useQueryClient()

  const mutationResult = useMutation({
    mutationFn: ({ cartId, lineItemId, body }: UpdateCartLineItemVariables) =>
      sdk.store.cart.updateLineItem(
        cartId,
        lineItemId,
        body,
        props.query,
        props.headers
      ),
    onSuccess: (_data, { cartId }) => {
      queryClient.invalidateQueries({ queryKey: ["cart", cartId] })
    },
  })

  return remapUseMutationResult(mutationResult, "updateCartLineItem")
}
