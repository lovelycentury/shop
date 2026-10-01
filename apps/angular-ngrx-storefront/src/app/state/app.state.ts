import { type EnvironmentProviders, type Provider, isDevMode } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { type ActionReducerMap, META_REDUCERS, provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { CartEffects } from './cart/cart.effects';
import { type CartState, cartFeature } from './cart/cart.reducer';
import { OrdersEffects } from './orders/orders.effects';
import { type OrdersState, ordersFeature } from './orders/orders.reducer';
import { PaymentProvidersEffects } from './payment-providers/payment-providers.effects';
import {
  type PaymentProvidersState,
  paymentProvidersFeature,
} from './payment-providers/payment-providers.reducer';
import { ProductListsEffects } from './product-lists/product-lists.effects';
import { type ProductListsState, productListsFeature } from './product-lists/product-lists.reducer';
import { ProductsEffects } from './products/products.effects';
import { type ProductsState, productsFeature } from './products/products.reducer';
import { RegionsEffects } from './regions/regions.effects';
import { type RegionsState, regionsFeature } from './regions/regions.reducer';
import { ShippingOptionsEffects } from './shipping-options/shipping-options.effects';
import {
  type ShippingOptionsState,
  shippingOptionsFeature,
} from './shipping-options/shipping-options.reducer';
import { transferStateMetaReducer } from './transfer-state.meta-reducer';

export type AppState = {
  [regionsFeature.name]: RegionsState;
  [productsFeature.name]: ProductsState;
  [productListsFeature.name]: ProductListsState;
  [cartFeature.name]: CartState;
  [ordersFeature.name]: OrdersState;
  [shippingOptionsFeature.name]: ShippingOptionsState;
  [paymentProvidersFeature.name]: PaymentProvidersState;
};

const reducers: ActionReducerMap<AppState> = {
  [regionsFeature.name]: regionsFeature.reducer,
  [productsFeature.name]: productsFeature.reducer,
  [productListsFeature.name]: productListsFeature.reducer,
  [cartFeature.name]: cartFeature.reducer,
  [ordersFeature.name]: ordersFeature.reducer,
  [shippingOptionsFeature.name]: shippingOptionsFeature.reducer,
  [paymentProvidersFeature.name]: paymentProvidersFeature.reducer,
};

/**
 * The whole store, registered at the root rather than per lazy route: every
 * slice is shared across screens, and `transferStateMetaReducer` hydrates
 * them all on the root `INIT`.
 */
export function provideAppState(): (Provider | EnvironmentProviders)[] {
  return [
    provideStore(reducers),
    { provide: META_REDUCERS, useFactory: transferStateMetaReducer, multi: true },
    provideEffects(
      RegionsEffects,
      ProductsEffects,
      ProductListsEffects,
      CartEffects,
      OrdersEffects,
      ShippingOptionsEffects,
      PaymentProvidersEffects,
    ),
    provideStoreDevtools({ maxAge: 50, logOnly: !isDevMode() }),
  ];
}
