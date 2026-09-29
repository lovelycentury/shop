import type { HttpTypes } from '@medusajs/types';
import { findVariant, isSizeAvailable, optionValues } from './product-variant';

type Picks = Record<string, string>;

const variant = (id: string, picks: Picks) =>
  ({
    id,
    options: Object.entries(picks).map(([title, value]) => ({ value, option: { title } })),
  }) as unknown as HttpTypes.StoreProductVariant;

const product = (options: Record<string, string[]>, variants: HttpTypes.StoreProductVariant[]) =>
  ({
    options: Object.entries(options).map(([title, values]) => ({
      title,
      values: values.map((value) => ({ id: `${title}_${value}`, value })),
    })),
    variants,
  }) as unknown as HttpTypes.StoreProduct;

// Black comes in S and M; white only in M.
const shirt = product({ Color: ['Black', 'White'], Size: ['S', 'M'] }, [
  variant('black_s', { Color: 'Black', Size: 'S' }),
  variant('black_m', { Color: 'Black', Size: 'M' }),
  variant('white_m', { Color: 'White', Size: 'M' }),
]);

describe('product variant selection', () => {
  it('reads an option’s values by title', () => {
    expect(optionValues(shirt, 'Size').map((value) => value.value)).toEqual(['S', 'M']);
    expect(optionValues(shirt, 'Material')).toEqual([]);
    expect(optionValues(null, 'Size')).toEqual([]);
  });

  it('resolves the color + size picks to a variant', () => {
    expect(findVariant(shirt, 'White', 'M')?.id).toBe('white_m');
    expect(findVariant(shirt, 'Black', 'S')?.id).toBe('black_s');
  });

  it('returns null for a combination no variant has', () => {
    expect(findVariant(shirt, 'White', 'S')).toBeNull();
  });

  it('ignores an option the product does not have', () => {
    const sizeOnly = product({ Size: ['S', 'M'] }, [variant('s', { Size: 'S' }), variant('m', { Size: 'M' })]);

    expect(findVariant(sizeOnly, 'Black', 'M')?.id).toBe('m');
  });

  it('returns null when the product has no variants', () => {
    expect(findVariant(product({}, []), null, null)).toBeNull();
    expect(findVariant(null, null, null)).toBeNull();
  });

  it('marks a size unavailable when the selected color does not come in it', () => {
    expect(isSizeAvailable(shirt, 'White', 'S')).toBe(false);
    expect(isSizeAvailable(shirt, 'White', 'M')).toBe(true);
    expect(isSizeAvailable(shirt, 'Black', 'S')).toBe(true);
  });

  it('treats every size as available when the product has no color option', () => {
    const sizeOnly = product({ Size: ['S'] }, [variant('s', { Size: 'S' })]);

    expect(isSizeAvailable(sizeOnly, null, 'XL')).toBe(true);
  });
});
