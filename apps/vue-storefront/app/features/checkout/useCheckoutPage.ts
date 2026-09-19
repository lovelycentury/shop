import { computed, watch } from "vue"

import { useCartId, useCurrentCart } from "~/features/cart"

import { CHECKOUT_STEPS, isCheckoutStep, type CheckoutStep } from "./constants"

/**
 * Checkout's shared state: the cart, which step is active (driven by
 * `?step=`, mirroring `useProductsPage`'s `?page=`), and how far the stepper
 * lets a visitor jump ahead of what the cart actually has data for.
 *
 * The "Cart" node itself is never a real step here - it renders as index 0
 * in the stepper and is always behind `activeStepIndex`, so it shows done
 * the moment this page is reached at all.
 */
export const useCheckoutPage = () => {
  const route = useRoute()
  const router = useRouter()

  const cartId = useCartId()

  const {
    cart: cartResponse,
    cartIsPending: cartQueryIsPending,
    cartIsError,
    cartError,
    cartRefetch,
  } = useCurrentCart()

  const cart = computed(() => cartResponse.value?.cart ?? null)

  // A cart query with no cart id is disabled, which TanStack Query reports
  // as pending forever - a visitor who never added anything would sit on
  // skeletons for good, so "no cart at all" is treated as already resolved.
  const cartIsPending = computed(
    () => cartId.value !== null && cartQueryIsPending.value
  )

  const { regions, regionsIsPending } = useRegions({
    query: { limit: 1, fields: "*countries" },
  })
  const countries = computed(() => regions.value?.regions?.[0]?.countries ?? [])

  const step = computed<CheckoutStep>(() => {
    const raw = Array.isArray(route.query.step)
      ? route.query.step[0]
      : route.query.step

    return isCheckoutStep(raw) ? raw : "shipping"
  })

  const goToStep = (next: CheckoutStep) => {
    router.push({ query: { ...route.query, step: next } })
  }

  const hasAddress = computed(() => Boolean(cart.value?.shipping_address))
  const hasShippingMethod = computed(
    () => (cart.value?.shipping_methods?.length ?? 0) > 0
  )
  const hasPaymentSession = computed(
    () => (cart.value?.payment_collection?.payment_sessions?.length ?? 0) > 0
  )

  /** The furthest step the cart's own data actually supports landing on. */
  const furthestUnlockedStep = computed<CheckoutStep>(() => {
    if (!hasAddress.value) return "shipping"
    if (!hasShippingMethod.value) return "delivery"
    if (!hasPaymentSession.value) return "payment"

    return "review"
  })

  // A direct or refreshed visit past what the cart supports (e.g. `?step=
  // review` on a cart with no address yet) bounces back to the furthest step
  // that's actually reachable, rather than rendering a step with nothing to
  // show.
  watch(
    [step, furthestUnlockedStep, cartIsPending],
    () => {
      if (cartIsPending.value) return
      if (
        CHECKOUT_STEPS.indexOf(step.value) >
        CHECKOUT_STEPS.indexOf(furthestUnlockedStep.value)
      ) {
        router.replace({
          query: { ...route.query, step: furthestUnlockedStep.value },
        })
      }
    },
    { immediate: true }
  )

  const stepperSteps = [
    { label: "Cart" },
    { label: "Shipping" },
    { label: "Delivery" },
    { label: "Payment" },
    { label: "Review" },
  ]

  const activeStepIndex = computed(() => CHECKOUT_STEPS.indexOf(step.value) + 1)

  const isEmpty = computed(
    () => !cartIsPending.value && (cart.value?.items?.length ?? 0) === 0
  )

  return {
    cart,
    cartIsPending: computed(
      () => cartIsPending.value || regionsIsPending.value
    ),
    cartIsError,
    cartError,
    cartRefetch,
    countries,
    step,
    goToStep,
    stepperSteps,
    activeStepIndex,
    isEmpty,
  }
}
