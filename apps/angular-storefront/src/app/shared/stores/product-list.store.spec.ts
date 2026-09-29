import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MEDUSA_SDK } from '../../core/services/medusa-sdk';
import { PRODUCTS_PAGE_SIZE, ProductListStore } from './product-list.store';

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

type ListQuery = { offset: number };

function setup(list: (query: ListQuery) => Promise<unknown>) {
  TestBed.configureTestingModule({
    providers: [{ provide: MEDUSA_SDK, useValue: { store: { product: { list } } } }],
  });

  return TestBed.inject(ProductListStore);
}

/** Page N's single product is `prod_pN`; 30 products total → 3 pages. */
const pageOf = (query: ListQuery) =>
  Promise.resolve({
    products: [{ id: `prod_p${query.offset / PRODUCTS_PAGE_SIZE + 1}` }],
    count: 30,
  });

describe('ProductListStore', () => {
  it('requests a priced page and derives the page count', async () => {
    const list = vi.fn(pageOf);
    const store = setup(list);

    store.load({ page: 2, regionId: 'reg_1' });
    await flushMicrotasks();

    expect(list).toHaveBeenCalledWith({
      limit: PRODUCTS_PAGE_SIZE,
      offset: PRODUCTS_PAGE_SIZE,
      fields: '*variants.calculated_price',
      region_id: 'reg_1',
    });
    expect(store.getAll().map((p) => p.id)).toEqual(['prod_p2']);
    expect(store.pageCount()).toBe(3);
  });

  it('skips a page that is already on screen or in flight, refresh does not', async () => {
    const list = vi.fn(pageOf);
    const store = setup(list);

    store.load({ page: 1, regionId: 'reg_1' });
    store.load({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();
    store.load({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();
    expect(list).toHaveBeenCalledTimes(1);

    store.refresh({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('keeps the previous page on screen, marked stale, while the next loads', async () => {
    let resolvePage2!: (value: unknown) => void;
    const list = vi
      .fn()
      .mockImplementationOnce(pageOf)
      .mockImplementationOnce(() => new Promise((resolve) => (resolvePage2 = resolve)));
    const store = setup(list);

    store.load({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();
    store.load({ page: 2, regionId: 'reg_1' });

    expect(store.stale()).toBe(true);
    expect(store.getAll().map((p) => p.id)).toEqual(['prod_p1']);

    resolvePage2({ products: [{ id: 'prod_p2' }], count: 30 });
    await flushMicrotasks();

    expect(store.stale()).toBe(false);
    expect(store.getAll().map((p) => p.id)).toEqual(['prod_p2']);
  });

  it('going back to the loaded page while another is in flight still shows the right page', async () => {
    let resolvePage2!: (value: unknown) => void;
    const list = vi
      .fn()
      .mockImplementationOnce(pageOf)
      .mockImplementationOnce(() => new Promise((resolve) => (resolvePage2 = resolve)))
      .mockImplementationOnce(pageOf);
    const store = setup(list);

    store.load({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();
    store.load({ page: 2, regionId: 'reg_1' });
    store.load({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();

    // Page 2's response arrives late — `switchMap` already dropped it.
    resolvePage2({ products: [{ id: 'prod_p2' }], count: 30 });
    await flushMicrotasks();

    expect(list).toHaveBeenCalledTimes(3);
    expect(store.query()?.page).toBe(1);
    expect(store.getAll().map((p) => p.id)).toEqual(['prod_p1']);
  });

  it('allows retrying the same page after a failure', async () => {
    const list = vi.fn().mockRejectedValueOnce(new Error('network error')).mockImplementationOnce(pageOf);
    const store = setup(list);

    store.load({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();
    expect(store.error()).toBe('Error: network error');

    store.load({ page: 1, regionId: 'reg_1' });
    await flushMicrotasks();

    expect(list).toHaveBeenCalledTimes(2);
    expect(store.getAll().map((p) => p.id)).toEqual(['prod_p1']);
  });
});
