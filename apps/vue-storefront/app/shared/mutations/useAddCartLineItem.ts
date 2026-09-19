import { useMutation, useQueryClient } from "@tanstack/vue-query"

import type {
  AddCartLineItemVariables,
  UseAddCartLineItemProps,
} from "~/shared/types/medusa"

export const useAddCartLineItem = (props: UseAddCartLineItemProps = {}) => {
  const sdk = useMedusa()
  const queryClient = useQueryClient()

  const mutationResult = useMutation({
    mutationFn: ({ cartId, body }: AddCartLineItemVariables) =>
      sdk.store.cart.createLineItem(cartId, body, props.query, props.headers),
    onSuccess: (_data, { cartId }) => {
      queryClient.invalidateQueries({ queryKey: ["cart", cartId] })
    },
  })

  return remapUseMutationResult(mutationResult, "addCartLineItem")
}
