import { computed } from "vue"

import type { Product } from "~/shared/types/medusa"

/** Cards per page - a multiple of 2, 3 and 4, so no grid row is left ragged. */
export const PRODUCTS_PAGE_SIZE = 12

/** Why the grid has nothing to show, so the screen can say something useful. */
export type ProductsEmptyReason = "no-region" | "past-end" | "no-products"

const parsePage = (raw: unknown): number => {
  const page = Number(Array.isArray(raw) ? raw[0] : raw)

  return Number.isInteger(page) && page > 0 ? page : 1
}

/**
 * The products screen's data: one page of products, the page count to drive
 * the pagination with, and the current page read straight off the URL.
 *
 * The page lives in `?page=` rather than in component state so a page of
 * results can be linked to, reloaded and reached again with the back button.
 * Page 1 leaves the param off entirely, keeping the canonical listing URL
 * clean.
 *
 * Prices need a pricing context, so the region resolves first and the products
 * query stays disabled until it has - see `useRegions`.
 */
export const useProductsPage = () => {
  const route = useRoute()
  const router = useRouter()

  const page = computed(() => parsePage(route.query.page))

  const {
    regions,
    regionsIsPending,
    regionsIsError,
    regionsError,
    regionsRefetch,
  } = useRegions({ query: { limit: 1 } })

  const regionId = computed(() => regions.value?.regions?.[0]?.id)
  /** The store answered, but has no region at all - nothing can be priced. */
  const hasNoRegion = computed(
    () =>
      !regionsIsPending.value &&
      !regionsIsError.value &&
      regionId.value === undefined
  )

  const {
    products,
    productsIsPending,
    productsIsPlaceholderData,
    productsIsError,
    productsError,
    productsRefetch,
  } = useProducts(() => ({
    query: {
      limit: PRODUCTS_PAGE_SIZE,
      offset: (page.value - 1) * PRODUCTS_PAGE_SIZE,
      // Variants carry no price unless they are asked for explicitly, and
      // only ever relative to a region.
      fields: "*variants.calculated_price",
      region_id: regionId.value,
    },
    enabled: regionId.value !== undefined,
  }))

  const items = computed<Product[]>(() => products.value?.products ?? [])
  const total = computed(() => products.value?.count ?? 0)

  const pageCount = computed(() =>
    Math.max(1, Math.ceil(total.value / PRODUCTS_PAGE_SIZE))
  )

  const isError = computed(() => regionsIsError.value || productsIsError.value)
  const error = computed(() => regionsError.value ?? productsError.value)

  /**
   * Pending covers the region hop too: while it is in flight the products
   * query is disabled, which Vue Query reports as pending rather than
   * fetching - without this the screen would flash its empty state first.
   *
   * A disabled query stays pending forever, though, so the two ways the region
   * can fail to arrive - an error, or a store with no regions - have to break
   * out of it, or the screen would sit on skeletons for good.
   */
  const isPending = computed(
    () =>
      !isError.value &&
      !hasNoRegion.value &&
      (regionsIsPending.value || productsIsPending.value)
  )

  const emptyReason = computed<ProductsEmptyReason>(() => {
    if (hasNoRegion.value) return "no-region"
    if (page.value > 1) return "past-end"

    return "no-products"
  })

  const refetch = () => {
    // A failed region query leaves the products query disabled, so retrying
    // the products query alone would do nothing.
    if (regionsIsError.value) return regionsRefetch()

    return productsRefetch()
  }

  const goToPage = (next: number) => {
    const { page: _page, ...rest } = route.query

    router.push({
      query: next === 1 ? rest : { ...rest, page: String(next) },
    })
  }

  return {
    page,
    pageCount,
    total,
    items,
    isPending,
    isPlaceholder: productsIsPlaceholderData,
    isError,
    error,
    emptyReason,
    refetch,
    goToPage,
  }
}
