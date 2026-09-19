import { computed, ref, watch } from "vue"

import { useCurrentCart } from "~/features/cart"
import type { Product, ProductVariant } from "~/shared/types/medusa"

import { getProductPrice, getVariantPrice } from "./productPrice"

const COLOR_OPTION_TITLE = "Color"
const SIZE_OPTION_TITLE = "Size"

/** How many related products the "You may also like" row shows. */
const RELATED_PRODUCTS_COUNT = 4

const optionValues = (product: Product | null, title: string) =>
  product?.options?.find((option) => option.title === title)?.values ?? []

const variantMatches = (
  variant: ProductVariant,
  selected: Partial<Record<string, string>>
) =>
  Object.entries(selected).every(
    ([optionTitle, value]) =>
      value === undefined ||
      variant.options?.some(
        (variantOption) =>
          variantOption.option?.title === optionTitle &&
          variantOption.value === value
      )
  )

/**
 * The product detail screen's data: the product itself, the visitor's
 * color/size/quantity picks, the variant and price those picks resolve to,
 * "you may also like" suggestions, and the add-to-cart action.
 *
 * Mirrors `useProductsPage`'s region-first loading shape - prices need a
 * region, so the product query stays disabled until one resolves.
 */
export const useProductPage = () => {
  const route = useRoute()
  const productId = computed(() => String(route.params.id))

  const {
    regions,
    regionsIsPending,
    regionsIsError,
    regionsError,
    regionsRefetch,
  } = useRegions({ query: { limit: 1 } })

  const regionId = computed(() => regions.value?.regions?.[0]?.id)
  const hasNoRegion = computed(
    () =>
      !regionsIsPending.value &&
      !regionsIsError.value &&
      regionId.value === undefined
  )

  const {
    product: productResponse,
    productIsPending,
    productIsError,
    productError,
    productRefetch,
  } = useProductById(() => ({
    id: productId.value,
    query: {
      fields:
        "*variants.calculated_price,*variants.options,*options.values,*images",
      region_id: regionId.value,
    },
    enabled: regionId.value !== undefined,
  }))

  // `useProductById` hands back the raw `{ product }` envelope the Store API
  // responds with, same as `useProducts` hands back `{ products, count }`.
  const product = computed(() => productResponse.value?.product ?? null)

  const isError = computed(() => regionsIsError.value || productIsError.value)
  const error = computed(() => regionsError.value ?? productError.value)
  const isPending = computed(
    () =>
      !isError.value &&
      !hasNoRegion.value &&
      (regionsIsPending.value || productIsPending.value)
  )

  const refetch = () => {
    if (regionsIsError.value) return regionsRefetch()

    return productRefetch()
  }

  const colorOptions = computed(() =>
    optionValues(product.value, COLOR_OPTION_TITLE)
  )
  const sizeOptions = computed(() =>
    optionValues(product.value, SIZE_OPTION_TITLE)
  )

  const selectedColor = ref<string | null>(null)
  const selectedSize = ref<string | null>(null)

  // A different product was navigated to - the previous picks don't apply to
  // its options, so clear them and let the watcher below reseed defaults.
  watch(productId, () => {
    selectedColor.value = null
    selectedSize.value = null
  })

  watch(
    product,
    (value) => {
      if (!value) return

      selectedColor.value ??=
        optionValues(value, COLOR_OPTION_TITLE)[0]?.value ?? null
      selectedSize.value ??=
        optionValues(value, SIZE_OPTION_TITLE)[0]?.value ?? null
    },
    { immediate: true }
  )

  const selectedVariant = computed<ProductVariant | null>(() => {
    const variants = product.value?.variants ?? []

    if (variants.length === 0) return null

    const selected: Partial<Record<string, string>> = {
      [COLOR_OPTION_TITLE]:
        colorOptions.value.length > 0
          ? (selectedColor.value ?? undefined)
          : undefined,
      [SIZE_OPTION_TITLE]:
        sizeOptions.value.length > 0
          ? (selectedSize.value ?? undefined)
          : undefined,
    }

    return variants.find((variant) => variantMatches(variant, selected)) ?? null
  })

  /** Whether a size is reachable from the currently selected color at all. */
  const isSizeAvailable = (size: string) => {
    const variants = product.value?.variants ?? []

    if (colorOptions.value.length === 0) return true

    return variants.some((variant) =>
      variantMatches(variant, {
        [COLOR_OPTION_TITLE]: selectedColor.value ?? undefined,
        [SIZE_OPTION_TITLE]: size,
      })
    )
  }

  const price = computed(() => {
    if (selectedVariant.value) return getVariantPrice(selectedVariant.value)

    return product.value ? getProductPrice(product.value) : null
  })

  const quantity = ref(1)

  const { addItem, addItemIsPending, addItemError, itemCount } =
    useCurrentCart()

  const canAddToCart = computed(
    () => selectedVariant.value !== null && regionId.value !== undefined
  )

  const addToCart = () => {
    if (!selectedVariant.value || regionId.value === undefined) return undefined

    return addItem({
      variantId: selectedVariant.value.id,
      quantity: quantity.value,
      regionId: regionId.value,
    })
  }

  const { products: relatedCandidates } = useProducts(() => ({
    query: {
      limit: RELATED_PRODUCTS_COUNT + 1,
      fields: "*variants.calculated_price",
      region_id: regionId.value,
    },
    enabled: regionId.value !== undefined,
  }))

  const relatedProducts = computed(() =>
    (relatedCandidates.value?.products ?? [])
      .filter((candidate) => candidate.id !== productId.value)
      .slice(0, RELATED_PRODUCTS_COUNT)
  )

  return {
    product,
    isPending,
    isError,
    error,
    refetch,
    colorOptions,
    sizeOptions,
    selectedColor,
    selectedSize,
    isSizeAvailable,
    selectedVariant,
    price,
    quantity,
    canAddToCart,
    addToCart,
    addToCartIsPending: addItemIsPending,
    addToCartError: addItemError,
    cartItemCount: itemCount,
    relatedProducts,
  }
}
