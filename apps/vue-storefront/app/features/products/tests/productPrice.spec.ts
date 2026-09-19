import { describe, expect, it } from "vitest"

import type { Product, ProductVariant } from "~/shared/types/medusa"

import {
  formatOriginalPrice,
  formatPrice,
  getProductPrice,
} from "../productPrice"

const variant = (
  calculated: number | null,
  original: number | null = calculated,
  currency: string | null = "eur"
) =>
  ({
    calculated_price: {
      calculated_amount: calculated,
      original_amount: original,
      currency_code: currency,
    },
  }) as ProductVariant

const product = (variants: ProductVariant[] | null) =>
  ({ variants }) as Product

describe("getProductPrice", () => {
  it("picks the cheapest priced variant", () => {
    const result = getProductPrice(product([variant(30), variant(10), variant(20)]))

    expect(result).toEqual({
      amount: 10,
      currencyCode: "eur",
      originalAmount: null,
    })
  })

  it("reports the original amount only when it is a markdown", () => {
    expect(getProductPrice(product([variant(8, 12)]))?.originalAmount).toBe(12)
    expect(getProductPrice(product([variant(12, 12)]))?.originalAmount).toBeNull()
    expect(getProductPrice(product([variant(12, 8)]))?.originalAmount).toBeNull()
  })

  it("skips variants the pricing context left unpriced", () => {
    expect(getProductPrice(product([variant(null), variant(15)]))).toEqual({
      amount: 15,
      currencyCode: "eur",
      originalAmount: null,
    })
    expect(getProductPrice(product([variant(15, 15, null)]))).toBeNull()
    expect(getProductPrice(product([{} as ProductVariant]))).toBeNull()
  })

  it("returns null for a product with no variants at all", () => {
    expect(getProductPrice(product([]))).toBeNull()
    expect(getProductPrice(product(null))).toBeNull()
  })
})

describe("formatPrice", () => {
  it("formats in the currency the price carries", () => {
    expect(
      formatPrice({ amount: 10, currencyCode: "eur", originalAmount: null })
    ).toBe("€10.00")
    expect(
      formatPrice({ amount: 1234.5, currencyCode: "usd", originalAmount: null })
    ).toBe("$1,234.50")
  })

  it("formats the original amount, or nothing when there is none", () => {
    expect(
      formatOriginalPrice({ amount: 8, currencyCode: "usd", originalAmount: 12 })
    ).toBe("$12.00")
    expect(
      formatOriginalPrice({ amount: 8, currencyCode: "usd", originalAmount: null })
    ).toBeNull()
  })
})
