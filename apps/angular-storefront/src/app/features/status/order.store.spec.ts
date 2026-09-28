import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MEDUSA_SDK } from '../../core/services/medusa-sdk';
import { OrderStore } from './order.store';

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(retrieve: (id: string) => Promise<unknown>) {
  TestBed.configureTestingModule({
    providers: [{ provide: MEDUSA_SDK, useValue: { store: { order: { retrieve } } } }],
  });

  return TestBed.inject(OrderStore);
}

describe('OrderStore', () => {
  it('dedupes concurrent loadById calls and caches the order', async () => {
    const retrieve = vi.fn().mockResolvedValue({ order: { id: 'order_1', display_id: 42 } });
    const store = setup(retrieve);

    store.loadById('order_1');
    store.loadById('order_1');
    await flushMicrotasks();
    store.loadById('order_1');
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(store.getById('order_1')?.display_id).toBe(42);
  });

  it('allows a retry after a failure', async () => {
    const retrieve = vi
      .fn()
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({ order: { id: 'order_1' } });
    const store = setup(retrieve);

    store.loadById('order_1');
    await flushMicrotasks();
    expect(store.error()).toBe('Error: not found');

    store.loadById('order_1');
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(store.getById('order_1')?.id).toBe('order_1');
  });
});
