import { z } from "zod"

/** One postal address - shared shape for both the shipping and billing forms. */
export const addressSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  company: z.string().trim().optional(),
  address1: z.string().trim().min(1, "Address is required"),
  postalCode: z.string().trim().min(1, "Postal code is required"),
  city: z.string().trim().min(1, "City is required"),
  countryCode: z.string().trim().min(1, "Country is required"),
  province: z.string().trim().optional(),
})

export type AddressFormValues = z.infer<typeof addressSchema>

/**
 * Same shape as `addressSchema`, but with no `min(1)` checks - every field
 * accepts an empty string. Used for the *type* of a billing address that
 * might not need to be filled in at all (see `shippingStepSchema` below);
 * `addressSchema` itself still does the real validation, conditionally.
 */
const looseAddressSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  company: z.string(),
  address1: z.string(),
  postalCode: z.string(),
  city: z.string(),
  countryCode: z.string(),
  province: z.string(),
})

/**
 * The empty address a billing form starts from when a visitor unchecks
 * "Billing address same as shipping address" - kept blank rather than
 * copying the shipping values, so the fields visibly need filling in.
 */
export const emptyAddress: AddressFormValues = {
  firstName: "",
  lastName: "",
  company: "",
  address1: "",
  postalCode: "",
  city: "",
  countryCode: "",
  province: "",
}

export const shippingStepSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Enter a valid email"),
    phone: z.string().trim().optional(),
    shippingAddress: addressSchema,
    billingSameAsShipping: z.boolean(),
    billingAddress: looseAddressSchema,
  })
  .superRefine((value, ctx) => {
    if (value.billingSameAsShipping) return

    const result = addressSchema.safeParse(value.billingAddress)

    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ["billingAddress", ...issue.path] })
      }
    }
  })

export type ShippingStepValues = z.infer<typeof shippingStepSchema>

export const deliveryStepSchema = z.object({
  shippingOptionId: z.string().min(1, "Select a delivery method"),
})

export type DeliveryStepValues = z.infer<typeof deliveryStepSchema>
