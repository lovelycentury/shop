import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MEDUSA_SDK } from '../../core/services/medusa-sdk';
import { ProductsStore } from './products.store';

function setup(retrieve: (id: string) => Promise<{ product: { id: string; title: string } }>) {
  TestBed.configureTestingModule({
    providers: [{ provide: MEDUSA_SDK, useValue: { store: { product: { retrieve } } } }],
  });

  return TestBed.inject(ProductsStore);
}

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('ProductsStore', () => {
  it('dedupes concurrent loadById calls for the same id', async () => {
    const retrieve = vi.fn().mockResolvedValue({ product: { id: 'prod_1', title: 'Test product' } });
    const store = setup(retrieve);

    store.loadById('prod_1');
    store.loadById('prod_1');
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(store.getById('prod_1')?.title).toBe('Test product');
  });

  it('does not refetch a product that is already cached', async () => {
    const retrieve = vi.fn().mockResolvedValue({ product: { id: 'prod_1', title: 'Test product' } });
    const store = setup(retrieve);

    store.loadById('prod_1');
    await flushMicrotasks();
    store.loadById('prod_1');
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(1);
  });

  it('fetches different ids concurrently without cancelling each other', async () => {
    const retrieve = vi.fn((id: string) => Promise.resolve({ product: { id, title: `Product ${id}` } }));
    const store = setup(retrieve);

    store.loadById('prod_1');
    store.loadById('prod_2');
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(store.getById('prod_1')?.title).toBe('Product prod_1');
    expect(store.getById('prod_2')?.title).toBe('Product prod_2');
  });

  it('clears the pending marker on failure, allowing a retry', async () => {
    const retrieve = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ product: { id: 'prod_1', title: 'Test product' } });
    const store = setup(retrieve);

    store.loadById('prod_1');
    await flushMicrotasks();
    expect(store.error()).toBe('Error: network error');

    store.loadById('prod_1');
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(store.getById('prod_1')?.title).toBe('Test product');
  });

  it('refreshById refetches even when the product is already cached', async () => {
    const retrieve = vi
      .fn()
      .mockResolvedValueOnce({ product: { id: 'prod_1', title: 'Old title' } })
      .mockResolvedValueOnce({ product: { id: 'prod_1', title: 'New title' } });
    const store = setup(retrieve);

    store.loadById('prod_1');
    await flushMicrotasks();
    expect(store.getById('prod_1')?.title).toBe('Old title');

    store.loadById('prod_1'); // no-op, already cached
    await flushMicrotasks();
    expect(retrieve).toHaveBeenCalledTimes(1);

    store.refreshById('prod_1');
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(store.getById('prod_1')?.title).toBe('New title');
  });
});
