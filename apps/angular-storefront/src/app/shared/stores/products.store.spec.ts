import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MedusaSdk } from '../../core/services/medusa-sdk';
import { ProductsStore } from './products.store';

type Retrieve = (id: string, query: { region_id: string }) => Promise<unknown>;

function setup(retrieve: Retrieve) {
  TestBed.configureTestingModule({
    providers: [{ provide: MedusaSdk, useValue: { store: { product: { retrieve } } } }],
  });

  return TestBed.inject(ProductsStore);
}

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Title encodes the region it was priced for, so tests can tell them apart. */
const priced: Retrieve = (id, query) => Promise.resolve({ product: { id, title: `${id}@${query.region_id}` } });

describe('ProductsStore', () => {
  it('requests the product priced for the region, with the product-page fields', async () => {
    const retrieve = vi.fn(priced);
    const store = setup(retrieve);

    store.loadById({ id: 'prod_1', regionId: 'reg_1' });
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledWith('prod_1', {
      fields: '*variants.calculated_price,*variants.options,*options.values,*images',
      region_id: 'reg_1',
    });
    expect(store.getById('prod_1')?.title).toBe('prod_1@reg_1');
  });

  it('dedupes concurrent calls and skips cached products', async () => {
    const retrieve = vi.fn(priced);
    const store = setup(retrieve);

    store.loadById({ id: 'prod_1', regionId: 'reg_1' });
    store.loadById({ id: 'prod_1', regionId: 'reg_1' });
    expect(store.isLoading('prod_1')).toBe(true);
    await flushMicrotasks();
    store.loadById({ id: 'prod_1', regionId: 'reg_1' });
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(store.isLoading('prod_1')).toBe(false);
  });

  it('fetches different ids concurrently without cancelling each other', async () => {
    const retrieve = vi.fn(priced);
    const store = setup(retrieve);

    store.loadById({ id: 'prod_1', regionId: 'reg_1' });
    store.loadById({ id: 'prod_2', regionId: 'reg_1' });
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(store.getById('prod_1')?.title).toBe('prod_1@reg_1');
    expect(store.getById('prod_2')?.title).toBe('prod_2@reg_1');
  });

  it('drops the cache when the region changes, since prices depend on it', async () => {
    const retrieve = vi.fn(priced);
    const store = setup(retrieve);

    store.loadById({ id: 'prod_1', regionId: 'reg_1' });
    await flushMicrotasks();
    store.loadById({ id: 'prod_1', regionId: 'reg_2' });
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(store.getById('prod_1')?.title).toBe('prod_1@reg_2');
  });

  it('discards a response priced for a region that was switched away from', async () => {
    let resolveOld!: (value: unknown) => void;
    const retrieve = vi
      .fn<Retrieve>()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveOld = resolve)))
      .mockImplementationOnce(priced);
    const store = setup(retrieve);

    store.loadById({ id: 'prod_1', regionId: 'reg_1' });
    store.loadById({ id: 'prod_1', regionId: 'reg_2' });
    await flushMicrotasks();
    resolveOld({ product: { id: 'prod_1', title: 'prod_1@reg_1' } });
    await flushMicrotasks();

    expect(store.getById('prod_1')?.title).toBe('prod_1@reg_2');
  });

  it('clears the pending marker on failure, allowing a retry', async () => {
    const retrieve = vi.fn<Retrieve>().mockRejectedValueOnce(new Error('network error')).mockImplementationOnce(priced);
    const store = setup(retrieve);

    store.loadById({ id: 'prod_1', regionId: 'reg_1' });
    await flushMicrotasks();
    expect(store.error()).toBe('Error: network error');

    store.loadById({ id: 'prod_1', regionId: 'reg_1' });
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(store.getById('prod_1')?.title).toBe('prod_1@reg_1');
  });

  it('refreshById refetches even when the product is already cached', async () => {
    const retrieve = vi
      .fn<Retrieve>()
      .mockResolvedValueOnce({ product: { id: 'prod_1', title: 'Old title' } })
      .mockResolvedValueOnce({ product: { id: 'prod_1', title: 'New title' } });
    const store = setup(retrieve);

    store.loadById({ id: 'prod_1', regionId: 'reg_1' });
    await flushMicrotasks();
    store.refreshById({ id: 'prod_1', regionId: 'reg_1' });
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(store.getById('prod_1')?.title).toBe('New title');
  });
});
