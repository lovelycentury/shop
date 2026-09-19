import { useQuery } from "@tanstack/vue-query"

import type { UsePaymentProvidersProps } from "~/shared/types/medusa"

export const usePaymentProviders = (props: UsePaymentProvidersProps) => {
  const sdk = useMedusa()

  const queryResult = useQuery({
    queryKey: ["paymentProviders", props.query],
    queryFn: () =>
      sdk.store.payment.listPaymentProviders(props.query, props.headers),
  })

  return remapUseQueryResult(queryResult, "paymentProviders", null)
}
