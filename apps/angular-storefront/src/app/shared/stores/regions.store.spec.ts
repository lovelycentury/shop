import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MEDUSA_SDK } from '../../core/services/medusa-sdk';
import { RegionsStore } from './regions.store';

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(list: () => Promise<unknown>) {
  TestBed.configureTestingModule({
    providers: [{ provide: MEDUSA_SDK, useValue: { store: { region: { list } } } }],
  });

  return TestBed.inject(RegionsStore);
}

const twoRegions = () =>
  Promise.resolve({
    regions: [
      { id: 'reg_1', countries: [{ iso_2: 'dk' }] },
      { id: 'reg_2', countries: [{ iso_2: 'us' }] },
    ],
  });

describe('RegionsStore', () => {
  it('loads regions once and derives the default region and its countries', async () => {
    const list = vi.fn(twoRegions);
    const store = setup(list);

    store.load();
    await flushMicrotasks();
    store.load();
    await flushMicrotasks();

    expect(list).toHaveBeenCalledTimes(1);
    expect(store.defaultRegion()?.id).toBe('reg_1');
    expect(store.countries()).toEqual([{ iso_2: 'dk' }]);
    expect(store.getAll().map((region) => region.id)).toEqual(['reg_1', 'reg_2']);
    expect(store.getById('reg_2')?.countries).toEqual([{ iso_2: 'us' }]);
  });

  it('refresh refetches already-loaded regions', async () => {
    const list = vi.fn(twoRegions);
    const store = setup(list);

    store.load();
    await flushMicrotasks();
    store.refresh();
    await flushMicrotasks();

    expect(list).toHaveBeenCalledTimes(2);
  });

  it('never runs two requests at once', async () => {
    const list = vi.fn(twoRegions);
    const store = setup(list);

    store.load();
    store.load();
    store.refresh();
    await flushMicrotasks();

    expect(list).toHaveBeenCalledTimes(1);
    expect(store.loading()).toBe(false);
  });

  it('allows a retry after a failure', async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ regions: [{ id: 'reg_1', countries: [] }] });
    const store = setup(list);

    store.load();
    await flushMicrotasks();
    expect(store.error()).toBe('Error: network error');

    store.load();
    await flushMicrotasks();

    expect(list).toHaveBeenCalledTimes(2);
    expect(store.defaultRegion()?.id).toBe('reg_1');
  });
});
