import { signal } from "@angular/core"
import { TestBed } from "@angular/core/testing"
import { vi } from "vitest"
import { MEDUSA_SDK } from "../../core/services/medusa-sdk"
import { CartIdService } from "../../core/services/cart-id"
import { CartStore } from "./cart.store"

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0))

function setup(
  cartMethods: Record<string, unknown>,
  initialCartId: string | null = null
) {
  const cartIdService = {
    cartId: signal<string | null>(initialCartId),
    set: vi.fn((id: string) => cartIdService.cartId.set(id)),
    clear: vi.fn(() => cartIdService.cartId.set(null)),
  }

  TestBed.configureTestingModule({
    providers: [
      {
        provide: MEDUSA_SDK,
        useValue: { store: { cart: cartMethods, payment: {} } },
      },
      { provide: CartIdService, useValue: cartIdService },
    ],
  })

  return { store: TestBed.inject(CartStore), cartIdService }
}

/** Seeds `store.cart()` through the real `load()` path (needs `retrieve` on the mock). */
async function seedCart(store: InstanceType<typeof CartStore>) {
  store.load()
  await flushMicrotasks()
}

describe("CartStore", () => {
  it("addItem creates a cart lazily on first use, then adds the line item", async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ cart: { id: "cart_1", items: [] } })
    const createLineItem = vi.fn().mockResolvedValue({
      cart: { id: "cart_1", items: [{ id: "li_1", quantity: 2 }] },
    })
    const { store, cartIdService } = setup({ create, createLineItem })

    await store.addItem({
      variantId: "variant_1",
      quantity: 2,
      regionId: "region_1",
    })

    expect(create).toHaveBeenCalledWith({ region_id: "region_1" })
    expect(createLineItem).toHaveBeenCalledWith("cart_1", {
      variant_id: "variant_1",
      quantity: 2,
    })
    expect(cartIdService.set).toHaveBeenCalledWith("cart_1")
    expect(store.getCart()?.items?.length).toBe(1)
  })

  it("addItem reuses an existing cart id without creating a new cart", async () => {
    const create = vi.fn()
    const createLineItem = vi.fn().mockResolvedValue({
      cart: { id: "cart_1", items: [{ id: "li_1", quantity: 1 }] },
    })
    const { store } = setup({ create, createLineItem }, "cart_1")

    await store.addItem({
      variantId: "variant_1",
      quantity: 1,
      regionId: "region_1",
    })

    expect(create).not.toHaveBeenCalled()
    expect(createLineItem).toHaveBeenCalledWith("cart_1", {
      variant_id: "variant_1",
      quantity: 1,
    })
  })

  it("ignores a duplicate addItem call for the same variant while one is in flight", async () => {
    let resolveCreateLineItem!: (value: unknown) => void
    const createLineItem = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveCreateLineItem = resolve
        })
    )
    const { store } = setup({ create: vi.fn(), createLineItem }, "cart_1")

    const first = store.addItem({
      variantId: "variant_1",
      quantity: 1,
      regionId: "region_1",
    })
    const second = store.addItem({
      variantId: "variant_1",
      quantity: 1,
      regionId: "region_1",
    })

    resolveCreateLineItem({
      cart: { id: "cart_1", items: [{ id: "li_1", quantity: 1 }] },
    })
    await Promise.all([first, second])

    expect(createLineItem).toHaveBeenCalledTimes(1)
  })

  it("dedupes concurrent updateLineItem calls for the same line item", async () => {
    const retrieve = vi.fn().mockResolvedValue({
      cart: { id: "cart_1", items: [{ id: "li_1", quantity: 1 }] },
    })
    const updateLineItem = vi.fn().mockResolvedValue({
      cart: { id: "cart_1", items: [{ id: "li_1", quantity: 5 }] },
    })
    const { store } = setup({ retrieve, updateLineItem }, "cart_1")
    await seedCart(store)

    store.updateLineItem({ lineItemId: "li_1", body: { quantity: 5 } })
    store.updateLineItem({ lineItemId: "li_1", body: { quantity: 5 } })
    await flushMicrotasks()

    expect(updateLineItem).toHaveBeenCalledTimes(1)
    expect(store.getCart()?.items?.[0].quantity).toBe(5)
  })

  it("updates different line items concurrently without blocking each other", async () => {
    const retrieve = vi
      .fn()
      .mockResolvedValue({ cart: { id: "cart_1", items: [] } })
    const updateLineItem = vi.fn(
      (_cartId: string, lineItemId: string, body: { quantity: number }) =>
        Promise.resolve({
          cart: {
            id: "cart_1",
            items: [{ id: lineItemId, quantity: body.quantity }],
          },
        })
    )
    const { store } = setup({ retrieve, updateLineItem }, "cart_1")
    await seedCart(store)

    store.updateLineItem({ lineItemId: "li_1", body: { quantity: 2 } })
    store.updateLineItem({ lineItemId: "li_2", body: { quantity: 3 } })
    await flushMicrotasks()

    expect(updateLineItem).toHaveBeenCalledTimes(2)
  })

  it("removeLineItem replaces the cart with the response parent", async () => {
    const retrieve = vi.fn().mockResolvedValue({
      cart: { id: "cart_1", items: [{ id: "li_1", quantity: 1 }] },
    })
    const deleteLineItem = vi.fn().mockResolvedValue({
      parent: { id: "cart_1", items: [] },
      id: "li_1",
      object: "line-item",
      deleted: true,
    })
    const { store } = setup({ retrieve, deleteLineItem }, "cart_1")
    await seedCart(store)

    store.removeLineItem("li_1")
    await flushMicrotasks()

    expect(deleteLineItem).toHaveBeenCalledWith("cart_1", "li_1")
    expect(store.getCart()?.items).toEqual([])
  })

  it("complete() stores the order and clears the cart id on success", async () => {
    const retrieve = vi
      .fn()
      .mockResolvedValue({ cart: { id: "cart_1", items: [] } })
    const complete = vi
      .fn()
      .mockResolvedValue({ type: "order", order: { id: "order_1" } })
    const { store, cartIdService } = setup({ retrieve, complete }, "cart_1")
    await seedCart(store)

    store.complete()
    await flushMicrotasks()

    expect(store.completedOrder()?.id).toBe("order_1")
    expect(store.getCart()).toBeNull()
    expect(cartIdService.clear).toHaveBeenCalled()
  })

  it("complete() surfaces a validation error without clearing the cart", async () => {
    const errorCart = { id: "cart_1", items: [] }
    const retrieve = vi.fn().mockResolvedValue({ cart: errorCart })
    const complete = vi.fn().mockResolvedValue({
      type: "cart",
      cart: errorCart,
      error: { message: "Payment required", name: "x", type: "x" },
    })
    const { store, cartIdService } = setup({ retrieve, complete }, "cart_1")
    await seedCart(store)

    store.complete()
    await flushMicrotasks()

    expect(store.error()).toBe("Payment required")
    expect(store.getCart()).toEqual(errorCart)
    expect(cartIdService.clear).not.toHaveBeenCalled()
  })
})
