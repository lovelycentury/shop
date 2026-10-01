import type { HttpTypes } from '@medusajs/types';

export const COLOR_OPTION_TITLE = 'Color';
export const SIZE_OPTION_TITLE = 'Size';

export type OptionSelection = Partial<Record<string, string>>;

export const optionValues = (
  product: HttpTypes.StoreProduct | null,
  title: string,
): HttpTypes.StoreProductOptionValue[] =>
  product?.options?.find((option) => option.title === title)?.values ?? [];

/** An `undefined` pick matches any value for that option. */
export const variantMatches = (variant: HttpTypes.StoreProductVariant, selected: OptionSelection): boolean =>
  Object.entries(selected).every(
    ([optionTitle, value]) =>
      value === undefined ||
      (variant.options ?? []).some(
        (variantOption) => variantOption.option?.title === optionTitle && variantOption.value === value,
      ),
  );

/**
 * The variant the visitor's color/size picks resolve to. An option the
 * product doesn't have is left out of the match rather than forcing a value
 * no variant carries.
 */
export const findVariant = (
  product: HttpTypes.StoreProduct | null,
  color: string | null,
  size: string | null,
): HttpTypes.StoreProductVariant | null => {
  const variants = product?.variants ?? [];

  if (variants.length === 0) return null;

  const selected: OptionSelection = {
    [COLOR_OPTION_TITLE]: optionValues(product, COLOR_OPTION_TITLE).length > 0 ? (color ?? undefined) : undefined,
    [SIZE_OPTION_TITLE]: optionValues(product, SIZE_OPTION_TITLE).length > 0 ? (size ?? undefined) : undefined,
  };

  return variants.find((variant) => variantMatches(variant, selected)) ?? null;
};

/** Whether a size is reachable from the currently selected color at all. */
export const isSizeAvailable = (product: HttpTypes.StoreProduct | null, color: string | null, size: string): boolean => {
  if (optionValues(product, COLOR_OPTION_TITLE).length === 0) return true;

  return (product?.variants ?? []).some((variant) =>
    variantMatches(variant, { [COLOR_OPTION_TITLE]: color ?? undefined, [SIZE_OPTION_TITLE]: size }),
  );
};
