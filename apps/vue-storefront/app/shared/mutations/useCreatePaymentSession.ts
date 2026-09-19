import { useMutation, useQueryClient } from "@tanstack/vue-query"

import type {
  CreatePaymentSessionVariables,
  UseCreatePaymentSessionProps,
} from "~/shared/types/medusa"

export const useCreatePaymentSession = (
  props: UseCreatePaymentSessionProps = {}
) => {
  const sdk = useMedusa()
  const queryClient = useQueryClient()

  const mutationResult = useMutation({
    mutationFn: ({ cart, body }: CreatePaymentSessionVariables) =>
      sdk.store.payment.initiatePaymentSession(
        cart,
        body,
        props.query,
        props.headers
      ),
    onSuccess: (_data, { cart }) => {
      queryClient.invalidateQueries({ queryKey: ["cart", cart.id] })
    },
  })

  return remapUseMutationResult(mutationResult, "createPaymentSession")
}
