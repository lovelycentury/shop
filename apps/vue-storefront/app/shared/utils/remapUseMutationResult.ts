import type { UseMutationReturnType } from "@tanstack/vue-query"

import remap, { type Remapped } from "./remap"

/**
 * Prefixes a `useMutation` result, so several mutations can be destructured side by side.
 *
 * const { checkoutMutate, checkoutIsPending, checkoutError } = remapUseMutationResult(useMutation(...), "checkout")
 */
const remapUseMutationResult = <
  TData,
  TError,
  TVariables,
  TOnMutateResult,
  P extends string,
>(
  useMutationResult: UseMutationReturnType<
    TData,
    TError,
    TVariables,
    TOnMutateResult
  >,
  prefix: P
): Remapped<
  UseMutationReturnType<TData, TError, TVariables, TOnMutateResult>,
  P
> => remap(useMutationResult, prefix)

export default remapUseMutationResult
