import type { ClientHeaders } from "@medusajs/js-sdk"
import { HttpTypes, type SelectParams } from "@medusajs/types"

export type UseAddCartLineItemProps = {
  query?: SelectParams
  headers?: ClientHeaders
}

export type AddCartLineItemVariables = {
  cartId: string
  body: HttpTypes.StoreAddCartLineItem
}

export type UseAddShippingMethodProps = {
  query?: SelectParams
  headers?: ClientHeaders
}

export type AddShippingMethodVariables = {
  cartId: string
  body: HttpTypes.StoreAddCartShippingMethods
}

export type UseCartProps = {
  id: string
  query?: SelectParams
  headers?: ClientHeaders
}

export type UseCompleteCartProps = {
  query?: SelectParams
  headers?: ClientHeaders
}

export type UseCreateCartProps = {
  query?: SelectParams
  headers?: ClientHeaders
}

export type UseCreatePaymentSessionProps = {
  query?: SelectParams
  headers?: ClientHeaders
}

export type CreatePaymentSessionVariables = {
  cart: HttpTypes.StoreCart
  body: HttpTypes.StoreInitializePaymentSession
}

export type UseDeleteCartLineItemProps = {
  query?: SelectParams
  headers?: ClientHeaders
}

export type DeleteCartLineItemVariables = {
  cartId: string
  lineItemId: string
}

export type UsePaymentProvidersProps = {
  query: HttpTypes.FindParams & HttpTypes.StorePaymentProviderFilters
  headers?: ClientHeaders
}

export type UseOrderProps = {
  id: string
  query?: SelectParams
  headers?: ClientHeaders
}

export type UseProductByIdProps = {
  id: string
  query?: HttpTypes.StoreProductParams
  headers?: ClientHeaders
  /**
   * Holds the request back while it is `false` - for a query whose params are
   * not known yet, such as one waiting on the region its prices are computed
   * for.
   */
  enabled?: boolean
}

export type UseProductsProps = {
  query?: HttpTypes.StoreProductListParams
  headers?: ClientHeaders
  /**
   * Holds the request back while it is `false` - for a query whose params are
   * not known yet, such as one waiting on the region its prices are computed
   * for.
   */
  enabled?: boolean
}

export type UseRegionsProps = {
  query?: HttpTypes.FindParams & HttpTypes.StoreRegionFilters
  headers?: ClientHeaders
}

export type UseShippingOptionsProps = {
  query: HttpTypes.StoreGetShippingOptionList
  headers?: ClientHeaders
  /**
   * Holds the request back while it is `false` - for a query whose params are
   * not known yet, such as one waiting on the cart it prices options for.
   */
  enabled?: boolean
}

export type UseUpdateCartProps = {
  query?: SelectParams
  headers?: ClientHeaders
}

export type UpdateCartVariables = {
  id: string
  body: HttpTypes.StoreUpdateCart
}

export type UseUpdateCartLineItemProps = {
  query?: SelectParams
  headers?: ClientHeaders
}

export type UpdateCartLineItemVariables = {
  cartId: string
  lineItemId: string
  body: HttpTypes.StoreUpdateCartLineItem
}

export type StoreCart = HttpTypes.StoreCart

export type Product = HttpTypes.StoreProduct

export type ProductVariant = HttpTypes.StoreProductVariant

export type CartLineItem = HttpTypes.StoreCartLineItem

export type CartAddress = HttpTypes.StoreCartAddress

export type CartShippingMethod = HttpTypes.StoreCartShippingMethod

export type PaymentProvider = HttpTypes.StorePaymentProvider

export type PaymentCollection = HttpTypes.StorePaymentCollection

export type PaymentSession = HttpTypes.StorePaymentSession

export type Order = HttpTypes.StoreOrder

export type Region = HttpTypes.StoreRegion

export type ShippingOption = HttpTypes.StoreShippingOption

/** A shipping option as returned for a specific cart - carries `calculated_price`. */
export type CartShippingOption =
  HttpTypes.StoreCartShippingOptionWithServiceZone

export type RegionCountry = HttpTypes.StoreRegionCountry

export type Customer = HttpTypes.StoreCustomer

export type CustomerAddress = HttpTypes.StoreCustomerAddress

export type Collection = HttpTypes.StoreCollection

export type ProductCategory = HttpTypes.StoreProductCategory

export type Currency = HttpTypes.StoreCurrency
