import { QueryClient, useMutation } from "@tanstack/vue-query"
import { afterEach, describe, expect, it } from "vitest"
import { effectScope, type EffectScope } from "vue"

import remapUseMutationResult from "../remapUseMutationResult"

const scopes: EffectScope[] = []

// useMutation needs an effect scope to dispose its observer with.
const runInScope = <T>(fn: () => T): T => {
  const scope = effectScope()
  scopes.push(scope)

  return scope.run(fn) as T
}

const doubleMutation = (mutationFn: (value: number) => Promise<number>) =>
  runInScope(() => useMutation({ mutationFn, retry: false }, new QueryClient()))

afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
})

describe("remapUseMutationResult", () => {
  it("prefixes every key of the mutation result", () => {
    const result = runInScope(() =>
      remapUseMutationResult(
        doubleMutation(async (value) => value * 2),
        "cart"
      )
    )

    expect(Object.keys(result)).toEqual(
      expect.arrayContaining([
        "cartData",
        "cartError",
        "cartIsPending",
        "cartStatus",
        "cartMutate",
        "cartMutateAsync",
        "cartReset",
      ])
    )
    expect(Object.keys(result)).not.toContain("mutate")
    expect(result.cartStatus.value).toBe("idle")
    expect(result.cartData.value).toBeUndefined()
  })

  it("passes the mutation's own refs through", () => {
    const mutation = doubleMutation(async (value) => value * 2)
    const result = runInScope(() => remapUseMutationResult(mutation, "cart"))

    expect(result.cartData).toBe(mutation.data)
    expect(result.cartIsPending).toBe(mutation.isPending)
  })

  it("runs mutateAsync after destructuring and updates the prefixed state", async () => {
    const result = runInScope(() =>
      remapUseMutationResult(
        doubleMutation(async (value) => value * 2),
        "cart"
      )
    )
    const { cartMutateAsync } = result

    const pending = cartMutateAsync(2)
    await expect.poll(() => result.cartIsPending.value).toBe(true)

    await expect(pending).resolves.toBe(4)
    expect(result.cartData.value).toBe(4)
    expect(result.cartIsSuccess.value).toBe(true)
    expect(result.cartIsPending.value).toBe(false)
    expect(result.cartVariables.value).toBe(2)
  })

  it("runs mutate and resets the prefixed state", async () => {
    const result = runInScope(() =>
      remapUseMutationResult(
        doubleMutation(async (value) => value * 2),
        "cart"
      )
    )
    const { cartMutate, cartReset } = result

    cartMutate(3)
    await expect.poll(() => result.cartData.value).toBe(6)

    cartReset()
    await expect.poll(() => result.cartStatus.value).toBe("idle")
    expect(result.cartData.value).toBeUndefined()
  })

  it("reports a failed mutation", async () => {
    const result = runInScope(() =>
      remapUseMutationResult(
        doubleMutation(async () => {
          throw new Error("boom")
        }),
        "cart"
      )
    )

    result.cartMutate(1)

    await expect.poll(() => result.cartIsError.value).toBe(true)
    expect(result.cartError.value).toEqual(new Error("boom"))
    expect(result.cartData.value).toBeUndefined()
  })
})
