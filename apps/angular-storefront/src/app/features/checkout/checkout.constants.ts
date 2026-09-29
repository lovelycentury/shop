import type { HttpTypes } from '@medusajs/types';

/** The only payment provider this store has enabled (see the backend seed/admin config). */
export const MANUAL_PAYMENT_PROVIDER_ID = 'pp_system_default';

export type CheckoutStep = 'shipping' | 'delivery' | 'payment' | 'review';

/** The order the steps happen in — also the stepper's order, right after its always-done "Cart" node. */
export const CHECKOUT_STEPS: readonly CheckoutStep[] = ['shipping', 'delivery', 'payment', 'review'];

export const isCheckoutStep = (value: unknown): value is CheckoutStep =>
  typeof value === 'string' && (CHECKOUT_STEPS as readonly string[]).includes(value);

/** The `?step=` query param as a step; anything missing or unknown means the first one. */
export const parseCheckoutStep = (raw: string | null): CheckoutStep => (isCheckoutStep(raw) ? raw : 'shipping');

/** The furthest step the cart's own data actually supports landing on. */
export const furthestUnlockedStep = (cart: HttpTypes.StoreCart): CheckoutStep => {
  if (!cart.shipping_address) return 'shipping';
  if ((cart.shipping_methods?.length ?? 0) === 0) return 'delivery';
  if ((cart.payment_collection?.payment_sessions?.length ?? 0) === 0) return 'payment';

  return 'review';
};
