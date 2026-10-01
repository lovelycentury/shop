import { createActionGroup, props } from '@ngrx/store';
import type { HttpTypes } from '@medusajs/types';
import type { AppError } from '../../core/models/app-error';

export type ProductQuery = {
  id: string;
  regionId: string;
};

export const ProductsActions = createActionGroup({
  source: 'Products',
  events: {
    /** Skips the request if the product is cached or already in flight. */
    'Load By Id': props<ProductQuery>(),
    /** Refetches even a cached product; still one request per id at a time. */
    'Refresh By Id': props<ProductQuery>(),
  },
});

export const ProductsApiActions = createActionGroup({
  source: 'Products API',
  events: {
    'Fetch Started': props<ProductQuery>(),
    'Fetch Succeeded': props<{ product: HttpTypes.StoreProduct; regionId: string }>(),
    'Fetch Failed': props<{ id: string; error: AppError }>(),
  },
});
