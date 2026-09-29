/** The only payment provider this store has enabled (see the backend seed/admin config). */
export const MANUAL_PAYMENT_PROVIDER_ID = 'pp_system_default';

export type CheckoutStep = 'shipping' | 'delivery' | 'payment' | 'review';

/** The order the steps happen in — also the stepper's order, right after its always-done "Cart" node. */
export const CHECKOUT_STEPS: readonly CheckoutStep[] = ['shipping', 'delivery', 'payment', 'review'];

export const isCheckoutStep = (value: unknown): value is CheckoutStep =>
  typeof value === 'string' && (CHECKOUT_STEPS as readonly string[]).includes(value);
