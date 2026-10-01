import type { HttpTypes } from '@medusajs/types';
import { formatAmount } from '../../shared/models/price';

export type ProductPrice = {
  /** What the customer pays, already in major units (Medusa v2 amounts are decimal). */
  amount: number;
  currencyCode: string;
  /** The struck-through price when this one is a discount, `null` otherwise. */
  originalAmount: number | null;
};

export const formatPrice = ({ amount, currencyCode }: ProductPrice): string => formatAmount(amount, currencyCode);

export const formatOriginalPrice = (price: ProductPrice): string | null =>
  price.originalAmount === null ? null : formatPrice({ ...price, amount: price.originalAmount });

/**
 * A single variant's price, or `null` when the Store API sent back no
 * `calculated_price` - which happens whenever the request had no pricing
 * context (`region_id`) or the variant simply has no price in that region.
 */
export const getVariantPrice = (variant: HttpTypes.StoreProductVariant): ProductPrice | null => {
  const price = variant.calculated_price;

  if (!price || price.calculated_amount == null || !price.currency_code) {
    return null;
  }

  return {
    amount: price.calculated_amount,
    currencyCode: price.currency_code,
    originalAmount:
      price.original_amount != null && price.original_amount > price.calculated_amount
        ? price.original_amount
        : null,
  };
};

/**
 * The cheapest priced variant - what a grid card shows as the product's
 * "from" price. Cards render without a price rather than with a misleading
 * zero when nothing carries one.
 */
export const getProductPrice = (product: HttpTypes.StoreProduct): ProductPrice | null => {
  let cheapest: ProductPrice | null = null;

  for (const variant of product.variants ?? []) {
    const price = getVariantPrice(variant);

    if (price === null) continue;
    if (cheapest !== null && cheapest.amount <= price.amount) continue;

    cheapest = price;
  }

  return cheapest;
};
