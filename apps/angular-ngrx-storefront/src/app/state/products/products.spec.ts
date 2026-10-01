import { vi } from 'vitest';
import { FetchError } from '@medusajs/js-sdk';
import { flushMicrotasks, setupState } from '../testing';
import { ProductsActions } from './products.actions';
import { productsFeature } from './products.reducer';

type Retrieve = (id: string, query: { region_id: string }) => Promise<unknown>;

function setup(retrieve: Retrieve) {
  const state = setupState({ product: { retrieve } });

  return {
    ...state,
    titleOf: (id: string) => state.read(productsFeature.selectEntities)[id]?.title,
    isLoading: (id: string) => state.read(productsFeature.selectPendingIds).includes(id),
  };
}

/** Title encodes the region it was priced for, so tests can tell them apart. */
const priced: Retrieve = (id, query) =>
  Promise.resolve({ product: { id, title: `${id}@${query.region_id}` } });

describe('products', () => {
  it('requests the product priced for the region, with the product-page fields', async () => {
    const retrieve = vi.fn(priced);
    const { store, titleOf } = setup(retrieve);

    store.dispatch(ProductsActions.loadById({ id: 'prod_1', regionId: 'reg_1' }));
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledWith('prod_1', {
      fields: '*variants.calculated_price,*variants.options,*options.values,*images',
      region_id: 'reg_1',
    });
    expect(titleOf('prod_1')).toBe('prod_1@reg_1');
  });

  it('dedupes concurrent calls and skips cached products', async () => {
    const retrieve = vi.fn(priced);
    const { store, isLoading } = setup(retrieve);

    store.dispatch(ProductsActions.loadById({ id: 'prod_1', regionId: 'reg_1' }));
    store.dispatch(ProductsActions.loadById({ id: 'prod_1', regionId: 'reg_1' }));
    expect(isLoading('prod_1')).toBe(true);
    await flushMicrotasks();
    store.dispatch(ProductsActions.loadById({ id: 'prod_1', regionId: 'reg_1' }));
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(isLoading('prod_1')).toBe(false);
  });

  it('fetches different ids concurrently without cancelling each other', async () => {
    const retrieve = vi.fn(priced);
    const { store, titleOf } = setup(retrieve);

    store.dispatch(ProductsActions.loadById({ id: 'prod_1', regionId: 'reg_1' }));
    store.dispatch(ProductsActions.loadById({ id: 'prod_2', regionId: 'reg_1' }));
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(titleOf('prod_1')).toBe('prod_1@reg_1');
    expect(titleOf('prod_2')).toBe('prod_2@reg_1');
  });

  it('drops the cache when the region changes, since prices depend on it', async () => {
    const retrieve = vi.fn(priced);
    const { store, titleOf } = setup(retrieve);

    store.dispatch(ProductsActions.loadById({ id: 'prod_1', regionId: 'reg_1' }));
    await flushMicrotasks();
    store.dispatch(ProductsActions.loadById({ id: 'prod_1', regionId: 'reg_2' }));
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(titleOf('prod_1')).toBe('prod_1@reg_2');
  });

  it('discards a response priced for a region that was switched away from', async () => {
    let resolveOld!: (value: unknown) => void;
    const retrieve = vi
      .fn<Retrieve>()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveOld = resolve)))
      .mockImplementationOnce(priced);
    const { store, titleOf } = setup(retrieve);

    store.dispatch(ProductsActions.loadById({ id: 'prod_1', regionId: 'reg_1' }));
    store.dispatch(ProductsActions.loadById({ id: 'prod_1', regionId: 'reg_2' }));
    await flushMicrotasks();
    resolveOld({ product: { id: 'prod_1', title: 'prod_1@reg_1' } });
    await flushMicrotasks();

    expect(titleOf('prod_1')).toBe('prod_1@reg_2');
  });

  it('clears the pending marker on failure, allowing a retry', async () => {
    const retrieve = vi
      .fn<Retrieve>()
      .mockRejectedValueOnce(new Error('network error'))
      .mockImplementationOnce(priced);
    const { store, read, titleOf } = setup(retrieve);

    store.dispatch(ProductsActions.loadById({ id: 'prod_1', regionId: 'reg_1' }));
    await flushMicrotasks();
    expect(read(productsFeature.selectError)?.kind).toBe('network');

    store.dispatch(ProductsActions.loadById({ id: 'prod_1', regionId: 'reg_1' }));
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(titleOf('prod_1')).toBe('prod_1@reg_1');
  });

  it('reports an unknown product as not-found', async () => {
    const retrieve = vi
      .fn<Retrieve>()
      .mockRejectedValue(new FetchError('Product with id: nope was not found', 'Not Found', 404));
    const { store, read, isLoading } = setup(retrieve);

    store.dispatch(ProductsActions.loadById({ id: 'nope', regionId: 'reg_1' }));
    await flushMicrotasks();

    expect(read(productsFeature.selectError)).toMatchObject({ kind: 'not-found', status: 404 });
    expect(isLoading('nope')).toBe(false);
  });

  it('refreshById refetches even when the product is already cached', async () => {
    const retrieve = vi
      .fn<Retrieve>()
      .mockResolvedValueOnce({ product: { id: 'prod_1', title: 'Old title' } })
      .mockResolvedValueOnce({ product: { id: 'prod_1', title: 'New title' } });
    const { store, titleOf } = setup(retrieve);

    store.dispatch(ProductsActions.loadById({ id: 'prod_1', regionId: 'reg_1' }));
    await flushMicrotasks();
    store.dispatch(ProductsActions.refreshById({ id: 'prod_1', regionId: 'reg_1' }));
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(titleOf('prod_1')).toBe('New title');
  });
});
