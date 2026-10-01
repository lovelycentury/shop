import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { type Action, Store } from '@ngrx/store';
import {
  type Observable,
  catchError,
  concat,
  defer,
  filter,
  map,
  mergeMap,
  of,
  switchMap,
  tap,
} from 'rxjs';
import type { HttpTypes } from '@medusajs/types';
import { CartIdService } from '../../core/services/cart-id';
import { injectMedusaSdk } from '../../core/services/medusa-sdk';
import { CartActions, CartApiActions, addPendingKey } from './cart.actions';
import { type CartState, cartFeature } from './cart.reducer';

const NO_CART = 'There is no cart to update.';
const CART_BUSY = 'The cart is still being updated - try again in a moment.';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Everything else (items, addresses, shipping methods) comes back by
 * default - the payment collection's sessions are the one relation the
 * checkout steps need that isn't.
 */
const CART_FIELDS = '*payment_collection.payment_sessions';

/**
 * Every guard here reads state *before* the matching `...Started` action
 * lands - which is why the UI's action and the one that marks the work as
 * pending are two different actions.
 */
@Injectable()
export class CartEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly sdk = injectMedusaSdk();
  private readonly cartIdService = inject(CartIdService);

  private readonly cartState$ = this.store.select(cartFeature.selectCartState);

  readonly load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CartActions.load),
      concatLatestFrom(() => this.cartState$),
      filter(([, state]) => this.cartIdService.cartId() !== null && !state.loading && !state.cart),
      map(() => CartApiActions.fetchStarted()),
    ),
  );

  readonly refresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CartActions.refresh),
      concatLatestFrom(() => this.cartState$),
      filter(([, state]) => this.cartIdService.cartId() !== null && !state.loading),
      map(() => CartApiActions.fetchStarted()),
    ),
  );

  readonly fetch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CartApiActions.fetchStarted),
      switchMap(() =>
        defer(() =>
          this.sdk.store.cart.retrieve(this.cartIdService.cartId() as string, {
            fields: CART_FIELDS,
          }),
        ).pipe(
          map(({ cart }) => CartApiActions.fetchSucceeded({ cart })),
          catchError((error: unknown) => of(CartApiActions.fetchFailed({ error: String(error) }))),
        ),
      ),
    ),
  );

  readonly addItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CartActions.addItem),
      concatLatestFrom(() => this.store.select(cartFeature.selectPendingLineItemIds)),
      filter(([{ variantId }, pendingIds]) => !pendingIds.includes(addPendingKey(variantId))),
      mergeMap(([{ variantId, quantity, regionId }]) => {
        const pendingKey = addPendingKey(variantId);

        return concat(
          of(CartApiActions.addItemStarted({ pendingKey })),
          defer(async () => {
            let cartId = this.cartIdService.cartId();

            if (!cartId) {
              const { cart } = await this.sdk.store.cart.create({ region_id: regionId });
              cartId = cart.id;
              this.cartIdService.set(cartId);
            }

            return this.sdk.store.cart.createLineItem(cartId, { variant_id: variantId, quantity });
          }).pipe(
            map(({ cart }) => CartApiActions.addItemSucceeded({ pendingKey, cart })),
            catchError((error: unknown) =>
              of(CartApiActions.addItemFailed({ pendingKey, error: String(error) })),
            ),
          ),
        );
      }),
    ),
  );

  readonly updateLineItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CartActions.updateLineItem),
      concatLatestFrom(() => this.cartState$),
      filter(
        ([{ lineItemId }, state]) => !!state.cart && !state.pendingLineItemIds.includes(lineItemId),
      ),
      mergeMap(([{ lineItemId, body }, state]) =>
        this.lineItemMutation(lineItemId, async () => {
          const { cart } = await this.sdk.store.cart.updateLineItem(
            state.cart!.id,
            lineItemId,
            body,
          );
          return cart;
        }),
      ),
    ),
  );

  readonly removeLineItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CartActions.removeLineItem),
      concatLatestFrom(() => this.cartState$),
      filter(
        ([{ lineItemId }, state]) => !!state.cart && !state.pendingLineItemIds.includes(lineItemId),
      ),
      mergeMap(([{ lineItemId }, state]) =>
        this.lineItemMutation(lineItemId, async () => {
          const { parent } = await this.sdk.store.cart.deleteLineItem(state.cart!.id, lineItemId);
          return parent ?? null;
        }),
      ),
    ),
  );

  readonly updateCart$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CartActions.updateCart),
      concatLatestFrom(() => this.cartState$),
      mergeMap(([{ body }, state]) =>
        this.cartMutation(state, async (cart) => {
          const response = await this.sdk.store.cart.update(cart.id, body, { fields: CART_FIELDS });
          return response.cart;
        }),
      ),
    ),
  );

  readonly addShippingMethod$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CartActions.addShippingMethod),
      concatLatestFrom(() => this.cartState$),
      mergeMap(([{ body }, state]) =>
        this.cartMutation(state, async (cart) => {
          const response = await this.sdk.store.cart.addShippingMethod(cart.id, body, {
            fields: CART_FIELDS,
          });
          return response.cart;
        }),
      ),
    ),
  );

  /**
   * The response is the payment collection, not the cart - so the cart is
   * refetched to pick up the new session the Review step checks for.
   */
  readonly createPaymentSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CartActions.createPaymentSession),
      concatLatestFrom(() => this.cartState$),
      mergeMap(([{ body }, state]) =>
        this.cartMutation(state, async (cart) => {
          await this.sdk.store.payment.initiatePaymentSession(cart, body);
          const response = await this.sdk.store.cart.retrieve(cart.id, { fields: CART_FIELDS });
          return response.cart;
        }),
      ),
    ),
  );

  readonly complete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CartActions.complete),
      concatLatestFrom(() => this.cartState$),
      mergeMap(([, state]) => {
        const blocked = this.blockedReason(state);
        if (blocked) return of(CartApiActions.mutationBlocked({ error: blocked }));

        return concat(
          of(CartApiActions.mutationStarted()),
          defer(() => this.sdk.store.cart.complete(state.cart!.id)).pipe(
            map((response) =>
              response.type === 'order'
                ? CartApiActions.orderPlaced({ order: response.order })
                : CartApiActions.orderRejected({
                    cart: response.cart,
                    message: response.error.message,
                  }),
            ),
            catchError((error: unknown) =>
              of(CartApiActions.mutationFailed({ error: errorMessage(error) })),
            ),
          ),
        );
      }),
    ),
  );

  /** The placed order's cart is spent, so the next purchase starts a fresh one. */
  readonly clearCartId$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(CartApiActions.orderPlaced),
        tap(() => this.cartIdService.clear()),
      ),
    { dispatch: false },
  );

  private blockedReason(state: CartState): string | null {
    if (!state.cart) return NO_CART;
    if (state.loading) return CART_BUSY;
    return null;
  }

  /** Runs one cart-level mutation that resolves to the updated cart. */
  private cartMutation(
    state: CartState,
    request: (cart: HttpTypes.StoreCart) => Promise<HttpTypes.StoreCart>,
  ): Observable<Action> {
    const blocked = this.blockedReason(state);
    if (blocked) return of(CartApiActions.mutationBlocked({ error: blocked }));

    return concat(
      of(CartApiActions.mutationStarted()),
      defer(() => request(state.cart!)).pipe(
        map((cart) => CartApiActions.mutationSucceeded({ cart })),
        catchError((error: unknown) =>
          of(CartApiActions.mutationFailed({ error: errorMessage(error) })),
        ),
      ),
    );
  }

  private lineItemMutation(
    lineItemId: string,
    request: () => Promise<HttpTypes.StoreCart | null>,
  ): Observable<Action> {
    return concat(
      of(CartApiActions.lineItemStarted({ lineItemId })),
      defer(request).pipe(
        map((cart) => CartApiActions.lineItemSucceeded({ lineItemId, cart })),
        catchError((error: unknown) =>
          of(CartApiActions.lineItemFailed({ lineItemId, error: String(error) })),
        ),
      ),
    );
  }
}
