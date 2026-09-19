/** The only payment provider this store has enabled (see `seed`/admin config). */
export const MANUAL_PAYMENT_PROVIDER_ID = "pp_system_default"

export type CheckoutStep = "shipping" | "delivery" | "payment" | "review"

/** Order the steps happen in - also the order the stepper renders them, right after the always-done "Cart" node. */
export const CHECKOUT_STEPS: CheckoutStep[] = [
  "shipping",
  "delivery",
  "payment",
  "review",
]

export const isCheckoutStep = (value: unknown): value is CheckoutStep =>
  typeof value === "string" && (CHECKOUT_STEPS as string[]).includes(value)
