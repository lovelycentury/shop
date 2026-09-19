export { default as ProductsScreen } from "./screens/ProductsScreen.vue"
export { default as ProductScreen } from "./screens/ProductScreen.vue"
export { default as ProductGrid } from "./components/ProductGrid.vue"
export { default as ProductCard } from "./components/ProductCard.vue"
export { default as ProductCardSkeleton } from "./components/ProductCardSkeleton.vue"
export { default as ProductGallery } from "./components/ProductGallery.vue"

export { PRODUCTS_PAGE_SIZE, useProductsPage } from "./useProductsPage"
export { useProductPage } from "./useProductPage"
export {
  formatOriginalPrice,
  formatPrice,
  getProductPrice,
  getVariantPrice,
  type ProductPrice,
} from "./productPrice"
export { swatchColor } from "./optionSwatch"
