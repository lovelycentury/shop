import type { Product } from "~/shared/types/medusa"

export type ProductPrice = {
  /** What the customer pays, already in major units (Medusa v2 amounts are decimal). */
  amount: number
  currencyCode: string
  /** The struck-through price when this one is a discount, `null` otherwise. */
  originalAmount: number | null
}

/**
 * A fixed locale rather than the visitor's: `Intl` would otherwise group and
 * place the currency symbol one way on the server (Node's locale) and another
 * in the browser, which Vue reports as a hydration mismatch on every card.
 */
const PRICE_LOCALE = "en-US"

export const formatPrice = ({ amount, currencyCode }: ProductPrice): string =>
  new Intl.NumberFormat(PRICE_LOCALE, {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(amount)

export const formatOriginalPrice = (price: ProductPrice): string | null =>
  price.originalAmount === null
    ? null
    : formatPrice({ ...price, amount: price.originalAmount })

/**
 * The cheapest priced variant - what a grid card shows as the product's
 * "from" price.
 *
 * Returns `null` when no variant carries a price, which is what the Store API
 * sends back whenever the request had no pricing context (`region_id`) or the
 * product simply has no price in that region. Cards render without a price
 * rather than with a misleading zero.
 */
export const getProductPrice = (product: Product): ProductPrice | null => {
  let cheapest: ProductPrice | null = null

  for (const variant of product.variants ?? []) {
    const price = variant.calculated_price

    if (!price || price.calculated_amount === null || !price.currency_code) {
      continue
    }

    if (cheapest !== null && cheapest.amount <= price.calculated_amount) {
      continue
    }

    cheapest = {
      amount: price.calculated_amount,
      currencyCode: price.currency_code,
      originalAmount:
        price.original_amount !== null &&
        price.original_amount > price.calculated_amount
          ? price.original_amount
          : null,
    }
  }

  return cheapest
}
