import { createSelector } from '@ngrx/store';
import type { ProductListKey } from './product-lists.actions';
import { productListsFeature } from './product-lists.reducer';

/** Cards per page - a multiple of 2, 3 and 4, so no grid row is left ragged. */
export const PRODUCTS_PAGE_SIZE = 12;

/** One listing's selectors. Built once per key below, so each stays memoized. */
const createProductListSelectors = (key: ProductListKey) => {
  const selectList = createSelector(
    productListsFeature.selectProductListsState,
    (state) => state[key],
  );

  return {
    selectList,
    selectProducts: createSelector(selectList, (list) => list.products),
    selectCount: createSelector(selectList, (list) => list.count),
    selectQuery: createSelector(selectList, (list) => list.query),
    selectError: createSelector(selectList, (list) => list.error),
    selectPageCount: createSelector(selectList, (list) =>
      Math.max(1, Math.ceil(list.count / PRODUCTS_PAGE_SIZE)),
    ),
    /** A newer page is loading over one already on screen. */
    selectStale: createSelector(selectList, (list) => list.loading && list.query !== null),
  };
};

/** The catalogue listing's page - the one `ProductsScreen` shows. */
export const catalogueSelectors = createProductListSelectors('catalogue');

/** The product page's "You may also like" row. */
export const relatedProductsSelectors = createProductListSelectors('related');
