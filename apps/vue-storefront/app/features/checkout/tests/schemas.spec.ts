import { describe, expect, it } from "vitest"

import {
  deliveryStepSchema,
  emptyAddress,
  shippingStepSchema,
} from "../schemas"

const validAddress = {
  firstName: "Oleksii",
  lastName: "Kryshtopa",
  company: "",
  address1: "Schmollerstrasse 57",
  postalCode: "74074",
  city: "Heilbronn",
  countryCode: "de",
  province: "",
}

const baseValues = {
  email: "oleksii@example.com",
  phone: "",
  shippingAddress: validAddress,
  billingSameAsShipping: true,
  billingAddress: emptyAddress,
}

describe("shippingStepSchema", () => {
  it("accepts a blank billing address when billingSameAsShipping is true", () => {
    expect(shippingStepSchema.safeParse(baseValues).success).toBe(true)
  })

  it("requires the billing address once billingSameAsShipping is false", () => {
    const result = shippingStepSchema.safeParse({
      ...baseValues,
      billingSameAsShipping: false,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."))
      expect(paths).toContain("billingAddress.firstName")
    }
  })

  it("passes once the billing address is filled in", () => {
    const result = shippingStepSchema.safeParse({
      ...baseValues,
      billingSameAsShipping: false,
      billingAddress: validAddress,
    })

    expect(result.success).toBe(true)
  })

  it("rejects a missing or malformed email", () => {
    expect(
      shippingStepSchema.safeParse({ ...baseValues, email: "" }).success
    ).toBe(false)
    expect(
      shippingStepSchema.safeParse({ ...baseValues, email: "not-an-email" })
        .success
    ).toBe(false)
  })

  it("requires every non-optional shipping address field", () => {
    const result = shippingStepSchema.safeParse({
      ...baseValues,
      shippingAddress: { ...validAddress, city: "" },
    })

    expect(result.success).toBe(false)
  })
})

describe("deliveryStepSchema", () => {
  it("requires a shipping option to be selected", () => {
    expect(deliveryStepSchema.safeParse({ shippingOptionId: "" }).success).toBe(
      false
    )
    expect(
      deliveryStepSchema.safeParse({ shippingOptionId: "so_123" }).success
    ).toBe(true)
  })
})
