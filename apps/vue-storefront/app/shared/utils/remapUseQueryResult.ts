import type { UseQueryReturnType } from "@tanstack/vue-query"
import { computed, type Ref } from "vue"

import remap, { type Remapped } from "./remap"

type RemappedQueryResult<TData, TError, P extends string, TDefault> = Remapped<
  Omit<UseQueryReturnType<TData, TError>, "data">,
  P
> & {
  [K in P]: Ref<undefined extends TDefault ? TData | undefined : TData>
}

/**
 * Prefixes a `useQuery` result, so several queries can be destructured side by side.
 * `data` takes the prefix itself, every other key is prefixed.
 *
 * const { products, productsIsLoading, productsRefetch } = remapUseQueryResult(useQuery(...), "products")
 *
 * Pass `defaultValue` to fall back to it while the query has no data, which drops
 * `undefined` from the remapped data type.
 */
const remapUseQueryResult = <
  TData,
  TError,
  P extends string,
  TDefault extends TData | undefined | null = undefined,
>(
  useQueryResult: UseQueryReturnType<TData, TError>,
  prefix: P,
  defaultValue?: TDefault
): RemappedQueryResult<TData, TError, P, TDefault> => {
  const { data, ...rest } = useQueryResult

  const value =
    defaultValue === undefined
      ? data
      : computed(() => data.value ?? defaultValue)

  return Object.defineProperty(remap(rest, prefix), prefix, {
    value,
    enumerable: true,
  }) as RemappedQueryResult<TData, TError, P, TDefault>
}

export default remapUseQueryResult
