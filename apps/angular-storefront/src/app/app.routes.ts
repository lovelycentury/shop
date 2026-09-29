import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Products',
    loadComponent: () =>
      import('./features/products/screens/products-screen/products-screen').then((m) => m.ProductsScreen),
  },
];
