# Angular NgRx Storefront

The same storefront as `apps/angular-storefront`, with the same screens, SSR and tests. The state
layer is classic NgRx (`@ngrx/store` + `@ngrx/effects` + `@ngrx/entity`) instead of
`@ngrx/signals` `signalStore`s. It exists to compare how much boilerplate each approach takes.

```bash
npm run angular-ngrx-storefront:dev   # from the repo root, http://localhost:8003
npm test                              # from this directory
```

## State layout

```text
src/app/state/
├── app.state.ts                    # AppState, root reducer map, provideAppState()
├── transfer-state.meta-reducer.ts  # SSR -> browser hydration (was withTransferState)
├── dispatch-and-wait.ts            # await an effect's outcome (was `await store.method()`)
├── testing.ts                      # real store + effects against a fake SDK
└── <feature>/
    ├── <feature>.actions.ts        # UI actions + API actions (createActionGroup)
    ├── <feature>.reducer.ts        # createFeature: reducer + generated selectors
    ├── <feature>.effects.ts        # guards + SDK calls
    └── <feature>.selectors.ts      # only where derived/keyed selectors are needed
```

Features: `regions`, `products` (entity adapter), `productLists` (keyed `catalogue` / `related`),
`cart`, `orders` (entity adapter), `shippingOptions`, `paymentProviders`.

## How the signal store versions map to NgRx

| `@ngrx/signals`                                  | Classic NgRx                                                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `rxMethod` with a `filter` guard + `patchState`  | UI action -> effect guard (`concatLatestFrom`) -> `...Started` action -> fetch effect -> success/failure actions |
| `withComputed`                                   | `extraSelectors` / `createSelector`                                                                              |
| `withEntities`                                   | `createEntityAdapter`                                                                                            |
| `async` method the caller awaits (`updateCart`)  | `dispatchAndWait(store, actions$, action, RESULT_ACTIONS)`                                                       |
| Component-scoped `RelatedProductsStore` instance | A keyed slice (`productLists.related`), since there is one global store                                          |
| `withTransferState('key')` per store             | A single meta-reducer that serializes selected slices and rehydrates them on `INIT`                              |
| `store.cart()`                                   | `store.selectSignal(cartFeature.selectCart)`                                                                     |

Why the separate `...Started` action: reducers run before effects see an action. If the UI action
itself set `loading`, the effect's "already loading?" guard would always see `true`. So the UI
action only asks for the work. The effect decides whether it happens, and `...Started` is the
action that marks it as pending.
