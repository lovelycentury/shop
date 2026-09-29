import { Routes } from '@angular/router';

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
    loadComponent: () =>
      import('./features/checkout/screens/checkout-screen/checkout-screen').then((m) => m.CheckoutScreen),
  },
  {
    path: 'order/success',
    title: 'Order confirmed',
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
