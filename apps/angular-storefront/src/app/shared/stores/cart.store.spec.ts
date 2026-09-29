import { signal } from "@angular/core"
import { TestBed } from "@angular/core/testing"
import { vi } from "vitest"
import { MedusaSdk } from "../../core/services/medusa-sdk"
import { CartIdService } from "../../core/services/cart-id"
import { CartStore } from "./cart.store"

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0))

function setup(
  cartMethods: Record<string, unknown>,
  initialCartId: string | null = null,
  paymentMethods: Record<string, unknown> = {}
) {
  const cartIdService = {
    cartId: signal<string | null>(initialCartId),
    set: vi.fn((id: string) => cartIdService.cartId.set(id)),
    clear: vi.fn(() => cartIdService.cartId.set(null)),
  }

  TestBed.configureTestingModule({
    providers: [
      {
        provide: MedusaSdk,
        useValue: { store: { cart: cartMethods, payment: paymentMethods } },
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

    expect(store.isAdding("variant_1")).toBe(true)
    expect(store.isAdding("variant_2")).toBe(false)

    resolveCreateLineItem({
      cart: { id: "cart_1", items: [{ id: "li_1", quantity: 1 }] },
    })
    await Promise.all([first, second])

    expect(createLineItem).toHaveBeenCalledTimes(1)
    expect(store.isAdding("variant_1")).toBe(false)
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

  it("updateCart resolves ok and stores the updated cart", async () => {
    const retrieve = vi
      .fn()
      .mockResolvedValue({ cart: { id: "cart_1", items: [] } })
    const update = vi
      .fn()
      .mockResolvedValue({ cart: { id: "cart_1", items: [], email: "a@b.co" } })
    const { store } = setup({ retrieve, update }, "cart_1")
    await seedCart(store)

    const result = await store.updateCart({ email: "a@b.co" })

    expect(result).toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith(
      "cart_1",
      { email: "a@b.co" },
      { fields: "*payment_collection.payment_sessions" }
    )
    expect(store.getCart()?.email).toBe("a@b.co")
    expect(store.loading()).toBe(false)
  })

  it("a cart mutation resolves with the error message on failure", async () => {
    const retrieve = vi
      .fn()
      .mockResolvedValue({ cart: { id: "cart_1", items: [] } })
    const addShippingMethod = vi
      .fn()
      .mockRejectedValue(new Error("Shipping option not available"))
    const { store } = setup({ retrieve, addShippingMethod }, "cart_1")
    await seedCart(store)

    const result = await store.addShippingMethod({ option_id: "so_1" })

    expect(result).toEqual({
      ok: false,
      error: "Shipping option not available",
    })
    expect(store.loading()).toBe(false)
  })

  it("refuses a second cart mutation while one is in flight", async () => {
    const retrieve = vi
      .fn()
      .mockResolvedValue({ cart: { id: "cart_1", items: [] } })
    let resolveUpdate!: (value: unknown) => void
    const update = vi.fn(
      () => new Promise((resolve) => (resolveUpdate = resolve))
    )
    const { store } = setup({ retrieve, update }, "cart_1")
    await seedCart(store)

    const first = store.updateCart({ email: "a@b.co" })
    const second = await store.updateCart({ email: "c@d.co" })
    resolveUpdate({ cart: { id: "cart_1", items: [] } })
    await first

    expect(second.ok).toBe(false)
    expect(update).toHaveBeenCalledTimes(1)
  })

  it("createPaymentSession refetches the cart to pick up the new session", async () => {
    const sessionCart = {
      id: "cart_1",
      items: [],
      payment_collection: { payment_sessions: [{ id: "ps_1" }] },
    }
    const retrieve = vi
      .fn()
      .mockResolvedValueOnce({ cart: { id: "cart_1", items: [] } })
      .mockResolvedValueOnce({ cart: sessionCart })
    const initiatePaymentSession = vi.fn().mockResolvedValue({})
    const { store } = setup(
      { retrieve },
      "cart_1",
      { initiatePaymentSession }
    )
    await seedCart(store)

    const result = await store.createPaymentSession({
      provider_id: "pp_system_default",
    })

    expect(result).toEqual({ ok: true })
    expect(initiatePaymentSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: "cart_1" }),
      { provider_id: "pp_system_default" }
    )
    expect(store.getCart()).toEqual(sessionCart)
  })

  it("complete() returns the order and clears the cart on success", async () => {
    const retrieve = vi
      .fn()
      .mockResolvedValue({ cart: { id: "cart_1", items: [] } })
    const complete = vi
      .fn()
      .mockResolvedValue({ type: "order", order: { id: "order_1" } })
    const { store, cartIdService } = setup({ retrieve, complete }, "cart_1")
    await seedCart(store)

    const result = await store.complete()

    expect(result).toEqual({ kind: "order", order: { id: "order_1" } })
    expect(store.getCart()).toBeNull()
    expect(cartIdService.clear).toHaveBeenCalled()
  })

  it("complete() reports a rejection without clearing the cart", async () => {
    const errorCart = { id: "cart_1", items: [] }
    const retrieve = vi.fn().mockResolvedValue({ cart: errorCart })
    const complete = vi.fn().mockResolvedValue({
      type: "cart",
      cart: errorCart,
      error: { message: "Payment required", name: "x", type: "x" },
    })
    const { store, cartIdService } = setup({ retrieve, complete }, "cart_1")
    await seedCart(store)

    const result = await store.complete()

    expect(result).toEqual({ kind: "rejected", message: "Payment required" })
    expect(store.error()).toBe("Payment required")
    expect(store.getCart()).toEqual(errorCart)
    expect(cartIdService.clear).not.toHaveBeenCalled()
  })

  it("complete() reports a failed request as failed, not rejected", async () => {
    const retrieve = vi
      .fn()
      .mockResolvedValue({ cart: { id: "cart_1", items: [] } })
    const complete = vi.fn().mockRejectedValue(new Error("Network down"))
    const { store, cartIdService } = setup({ retrieve, complete }, "cart_1")
    await seedCart(store)

    const result = await store.complete()

    expect(result).toEqual({ kind: "failed", message: "Network down" })
    expect(cartIdService.clear).not.toHaveBeenCalled()
  })
})
