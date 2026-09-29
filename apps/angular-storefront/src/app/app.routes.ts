import { Routes } from '@angular/router';
import { checkoutStepGuard, orderSuccessGuard } from './features/checkout/checkout.guards';

export const routes: Routes = [
  {
    path: '',
    title: 'Products',
    loadComponent: () =>
      import('./features/products/screens/products-screen/products-screen').then((m) => m.ProductsScreen),
  },
  {
    path: 'products/:id',
    title: 'Product',
    loadComponent: () =>
      import('./features/products/screens/product-screen/product-screen').then((m) => m.ProductScreen),
  },
  {
    path: 'checkout',
    title: 'Checkout',
    canActivate: [checkoutStepGuard],
    // The step lives in `?step=`, which the router doesn't re-run guards for
    // by default — every step change has to pass the guard.
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    loadComponent: () =>
      import('./features/checkout/screens/checkout-screen/checkout-screen').then((m) => m.CheckoutScreen),
  },
  {
    path: 'order/success',
    title: 'Order confirmed',
    canActivate: [orderSuccessGuard],
    loadComponent: () =>
      import('./features/checkout/screens/order-success-screen/order-success-screen').then(
        (m) => m.OrderSuccessScreen,
      ),
  },
  {
    path: 'order/failed',
    title: 'Order failed',
    loadComponent: () =>
      import('./features/checkout/screens/order-failed-screen/order-failed-screen').then((m) => m.OrderFailedScreen),
  },
];
