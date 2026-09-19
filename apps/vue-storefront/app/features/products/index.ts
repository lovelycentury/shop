export { default as ProductsScreen } from "./screens/ProductsScreen.vue"
export { default as ProductGrid } from "./components/ProductGrid.vue"
export { default as ProductCard } from "./components/ProductCard.vue"
export { default as ProductCardSkeleton } from "./components/ProductCardSkeleton.vue"

export { PRODUCTS_PAGE_SIZE, useProductsPage } from "./useProductsPage"
export {
  formatOriginalPrice,
  formatPrice,
  getProductPrice,
  type ProductPrice,
} from "./productPrice"
