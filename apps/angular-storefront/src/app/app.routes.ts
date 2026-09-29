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
];
