import { vi } from 'vitest';
import { flushMicrotasks, setupState } from '../testing';
import { OrdersActions } from './orders.actions';
import { ordersFeature } from './orders.reducer';

const setup = (retrieve: (id: string) => Promise<unknown>) => setupState({ order: { retrieve } });

describe('orders', () => {
  it('dedupes concurrent loadById calls and caches the order', async () => {
    const retrieve = vi.fn().mockResolvedValue({ order: { id: 'order_1', display_id: 42 } });
    const { store, read } = setup(retrieve);

    store.dispatch(OrdersActions.loadById({ id: 'order_1' }));
    store.dispatch(OrdersActions.loadById({ id: 'order_1' }));
    await flushMicrotasks();
    store.dispatch(OrdersActions.loadById({ id: 'order_1' }));
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(read(ordersFeature.selectEntities)['order_1']?.display_id).toBe(42);
  });

  it('allows a retry after a failure', async () => {
    const retrieve = vi
      .fn()
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({ order: { id: 'order_1' } });
    const { store, read } = setup(retrieve);

    store.dispatch(OrdersActions.loadById({ id: 'order_1' }));
    await flushMicrotasks();
    expect(read(ordersFeature.selectError)).toBe('Error: not found');

    store.dispatch(OrdersActions.loadById({ id: 'order_1' }));
    await flushMicrotasks();

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(read(ordersFeature.selectEntities)['order_1']?.id).toBe('order_1');
  });
});
