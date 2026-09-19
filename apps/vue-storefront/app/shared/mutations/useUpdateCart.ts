import { useMutation, useQueryClient } from "@tanstack/vue-query"

import type {
  UpdateCartVariables,
  UseUpdateCartProps,
} from "~/shared/types/medusa"

export const useUpdateCart = (props: UseUpdateCartProps = {}) => {
  const sdk = useMedusa()
  const queryClient = useQueryClient()

  const mutationResult = useMutation({
    mutationFn: ({ id, body }: UpdateCartVariables) =>
      sdk.store.cart.update(id, body, props.query, props.headers),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["cart", id] })
    },
  })

  return remapUseMutationResult(mutationResult, "updateCart")
}
