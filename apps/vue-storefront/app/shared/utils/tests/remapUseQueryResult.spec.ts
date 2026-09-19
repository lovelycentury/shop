import { QueryClient, useQuery } from "@tanstack/vue-query"
import { afterEach, describe, expect, it } from "vitest"
import { effectScope, type EffectScope } from "vue"

import remapUseQueryResult from "../remapUseQueryResult"

type Product = { id: string }

const scopes: EffectScope[] = []

// useQuery needs an effect scope to dispose its observer with.
const runInScope = <T>(fn: () => T): T => {
  const scope = effectScope()
  scopes.push(scope)

  return scope.run(fn) as T
}

const productsQuery = (queryFn: () => Promise<Product[]>) =>
  runInScope(() =>
    useQuery(
      { queryKey: ["products"], queryFn, retry: false },
      new QueryClient()
    )
  )

afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
})

describe("remapUseQueryResult", () => {
  it("exposes data under the bare prefix and prefixes every other key", async () => {
    const result = runInScope(() =>
      remapUseQueryResult(
        productsQuery(async () => [{ id: "1" }]),
        "products"
      )
    )

    expect(Object.keys(result)).toContain("products")
    expect(Object.keys(result)).not.toContain("data")
    expect(Object.keys(result)).not.toContain("productsData")
    expect(result.productsStatus.value).toBe("pending")
    expect(result.products.value).toBeUndefined()

    await expect.poll(() => result.products.value).toEqual([{ id: "1" }])
    expect(result.productsStatus.value).toBe("success")
    expect(result.productsIsLoading.value).toBe(false)
    expect(result.productsError.value).toBeNull()
  })

  it("passes the query's own refs and methods through", async () => {
    const query = productsQuery(async () => [{ id: "1" }])
    const result = runInScope(() => remapUseQueryResult(query, "products"))

    expect(result.productsStatus).toBe(query.status)
    expect(result.products).toBe(query.data)

    await expect.poll(() => result.products.value).toEqual([{ id: "1" }])

    const { productsRefetch } = result
    await productsRefetch()
    expect(result.productsIsFetching.value).toBe(false)
  })

  it("falls back to defaultValue while the query has no data", async () => {
    const fallback: Product[] = [{ id: "fallback" }]
    const result = runInScope(() =>
      remapUseQueryResult(
        productsQuery(async () => [{ id: "1" }]),
        "products",
        fallback
      )
    )

    expect(result.products.value).toEqual(fallback)

    await expect.poll(() => result.products.value).toEqual([{ id: "1" }])
  })

  it("keeps empty data over defaultValue", async () => {
    const result = runInScope(() =>
      remapUseQueryResult(
        productsQuery(async () => []),
        "products",
        [{ id: "fallback" }]
      )
    )

    await expect.poll(() => result.productsIsSuccess.value).toBe(true)
    expect(result.products.value).toEqual([])
  })

  it("reports a failed query and keeps serving defaultValue", async () => {
    const result = runInScope(() =>
      remapUseQueryResult(
        productsQuery(async () => {
          throw new Error("boom")
        }),
        "products",
        []
      )
    )

    await expect.poll(() => result.productsIsError.value).toBe(true)
    expect(result.productsError.value).toEqual(new Error("boom"))
    expect(result.products.value).toEqual([])
  })
})
