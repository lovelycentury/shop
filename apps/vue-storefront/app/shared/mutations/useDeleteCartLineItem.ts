import { useMutation, useQueryClient } from "@tanstack/vue-query"

import type {
  DeleteCartLineItemVariables,
  UseDeleteCartLineItemProps,
} from "~/shared/types/medusa"

export const useDeleteCartLineItem = (
  props: UseDeleteCartLineItemProps = {}
) => {
  const sdk = useMedusa()
  const queryClient = useQueryClient()

  const mutationResult = useMutation({
    mutationFn: ({ cartId, lineItemId }: DeleteCartLineItemVariables) =>
      sdk.store.cart.deleteLineItem(
        cartId,
        lineItemId,
        props.query,
        props.headers
      ),
    onSuccess: (_data, { cartId }) => {
      queryClient.invalidateQueries({ queryKey: ["cart", cartId] })
    },
  })

  return remapUseMutationResult(mutationResult, "deleteCartLineItem")
}
