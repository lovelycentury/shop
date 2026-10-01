import { vi } from 'vitest';
import { flushMicrotasks, setupState } from '../testing';
import { type ProductListQuery, ProductListsActions } from './product-lists.actions';
import {
  PRODUCTS_PAGE_SIZE,
  catalogueSelectors,
  relatedProductsSelectors,
} from './product-lists.selectors';

type ListQuery = { offset: number };

function setup(list: (query: ListQuery) => Promise<unknown>) {
  const state = setupState({ product: { list } });

  return {
    ...state,
    load: (query: ProductListQuery) =>
      state.store.dispatch(ProductListsActions.load({ key: 'catalogue', query })),
    refresh: (query: ProductListQuery) =>
      state.store.dispatch(ProductListsActions.refresh({ key: 'catalogue', query })),
    ids: () => state.read(catalogueSelectors.selectProducts).map((product) => product.id),
  };
}

/** Page N's single product is `prod_pN`; 30 products total -> 3 pages. */
const pageOf = (query: ListQuery) =>
  Promise.resolve({
    products: [{ id: `prod_p${query.offset / PRODUCTS_PAGE_SIZE + 1}` }],
    count: 30,
  });

describe('product lists', () => {
  it('requests a priced page and derives the page count', async () => {
    const list = vi.fn(pageOf);
    const { load, ids, read } = setup(list);

    load({ page: 2, regionId: 'reg_1' });
    await flushMicrotasks();

    expect(list).toHaveBeenCalledWith({
      limit: PRODUCTS_PAGE_SIZE,
      offset: PRODUCTS_PAGE_SIZE,
      fields: '*variants.calculated_price',
      region_id: 'reg_1',
    });
    expect(ids()).toEqual(['prod_p2']);
    expect(read(catalogueSelectors.selectPageCount)).toBe(3);
  });

  it('skips a page that is already on screen or in flight, refresh does not', async () => {
    const list = vi.fn(pageOf);
    const { load, refresh } = setup(list);

    load({ page: 1, regionId: 'reg_1' });
    load({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();
    load({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();
    expect(list).toHaveBeenCalledTimes(1);

    refresh({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('keeps the previous page on screen, marked stale, while the next loads', async () => {
    let resolvePage2!: (value: unknown) => void;
    const list = vi
      .fn()
      .mockImplementationOnce(pageOf)
      .mockImplementationOnce(() => new Promise((resolve) => (resolvePage2 = resolve)));
    const { load, ids, read } = setup(list);

    load({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();
    load({ page: 2, regionId: 'reg_1' });

    expect(read(catalogueSelectors.selectStale)).toBe(true);
    expect(ids()).toEqual(['prod_p1']);

    resolvePage2({ products: [{ id: 'prod_p2' }], count: 30 });
    await flushMicrotasks();

    expect(read(catalogueSelectors.selectStale)).toBe(false);
    expect(ids()).toEqual(['prod_p2']);
  });

  it('going back to the loaded page while another is in flight still shows the right page', async () => {
    let resolvePage2!: (value: unknown) => void;
    const list = vi
      .fn()
      .mockImplementationOnce(pageOf)
      .mockImplementationOnce(() => new Promise((resolve) => (resolvePage2 = resolve)))
      .mockImplementationOnce(pageOf);
    const { load, ids, read } = setup(list);

    load({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();
    load({ page: 2, regionId: 'reg_1' });
    load({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();

    // Page 2's response arrives late - `switchMap` already dropped it.
    resolvePage2({ products: [{ id: 'prod_p2' }], count: 30 });
    await flushMicrotasks();

    expect(list).toHaveBeenCalledTimes(3);
    expect(read(catalogueSelectors.selectQuery)?.page).toBe(1);
    expect(ids()).toEqual(['prod_p1']);
  });

  it('allows retrying the same page after a failure', async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockImplementationOnce(pageOf);
    const { load, ids, read } = setup(list);

    load({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();
    expect(read(catalogueSelectors.selectError)).toBe('Error: network error');

    load({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();

    expect(list).toHaveBeenCalledTimes(2);
    expect(ids()).toEqual(['prod_p1']);
  });

  it('keeps the two listings apart - loading one never cancels or replaces the other', async () => {
    const list = vi.fn(pageOf);
    const { store, load, ids, read } = setup(list);

    load({ page: 2, regionId: 'reg_1' });
    store.dispatch(
      ProductListsActions.load({ key: 'related', query: { page: 1, regionId: 'reg_1' } }),
    );
    await flushMicrotasks();

    expect(list).toHaveBeenCalledTimes(2);
    expect(ids()).toEqual(['prod_p2']);
    expect(read(relatedProductsSelectors.selectProducts).map((product) => product.id)).toEqual([
      'prod_p1',
    ]);
  });
});
