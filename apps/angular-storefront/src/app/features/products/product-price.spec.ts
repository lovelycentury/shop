import type { HttpTypes } from '@medusajs/types';
import { formatOriginalPrice, formatPrice, getProductPrice } from './product-price';

const variant = (calculated: number | null, original: number | null = calculated, currency = 'eur') =>
  ({
    calculated_price: { calculated_amount: calculated, original_amount: original, currency_code: currency },
  }) as unknown as HttpTypes.StoreProductVariant;

const product = (...variants: HttpTypes.StoreProductVariant[]) =>
  ({ variants }) as unknown as HttpTypes.StoreProduct;

describe('product price', () => {
  it('picks the cheapest priced variant', () => {
    expect(getProductPrice(product(variant(20), variant(10), variant(15)))?.amount).toBe(10);
  });

  it('ignores unpriced variants and returns null when none is priced', () => {
    expect(getProductPrice(product(variant(null), variant(12)))?.amount).toBe(12);
    expect(getProductPrice(product(variant(null)))).toBeNull();
    expect(getProductPrice(product())).toBeNull();
  });

  it('only reports an original price when it is a real discount', () => {
    expect(getProductPrice(product(variant(8, 10)))?.originalAmount).toBe(10);
    expect(getProductPrice(product(variant(10, 10)))?.originalAmount).toBeNull();
  });

  it('formats with a fixed locale so server and browser agree', () => {
    const price = { amount: 1234.5, currencyCode: 'eur', originalAmount: 2000 };

    expect(formatPrice(price)).toBe('€1,234.50');
    expect(formatOriginalPrice(price)).toBe('€2,000.00');
    expect(formatOriginalPrice({ ...price, originalAmount: null })).toBeNull();
  });
});
