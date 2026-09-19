import { HttpTypes } from "@medusajs/types"
import { useMutation } from "@tanstack/vue-query"

import type { UseCreateCartProps } from "~/shared/types/medusa"

export const useCreateCart = (props: UseCreateCartProps = {}) => {
  const sdk = useMedusa()

  const mutationResult = useMutation({
    mutationFn: (body: HttpTypes.StoreCreateCart) =>
      sdk.store.cart.create(body, props.query, props.headers),
  })

  return remapUseMutationResult(mutationResult, "createCart")
}
