import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type FieldTree, form } from '@angular/forms/signals';
import {
  type AddressModel,
  type ShippingModel,
  deliverySchema,
  emptyAddress,
  shippingSchema,
  toUpdateCartBody,
} from './checkout-forms';

const address = (overrides: Partial<AddressModel> = {}): AddressModel => ({
  firstName: 'Ada',
  lastName: 'Lovelace',
  company: '',
  address1: '1 Main St',
  postalCode: '1000',
  city: 'Copenhagen',
  countryCode: 'dk',
  province: '',
  ...overrides,
});

const validShipping = (overrides: Partial<ShippingModel> = {}): ShippingModel => ({
  email: 'ada@example.com',
  phone: '',
  shippingAddress: address(),
  billingSameAsShipping: true,
  billingAddress: emptyAddress(),
  ...overrides,
});

/** Signal Forms need an injection context to create a form. */
const makeForm = <T>(model: T, schema: Parameters<typeof form<T>>[1]) => {
  const injector = TestBed.inject(Injector);
  return runInInjectionContext(injector, () => form(signal(model), schema as never)) as FieldTree<T>;
};

const messages = (field: FieldTree<unknown>) => field().errors().map((error) => error.message);

describe('checkout forms', () => {
  it('accepts a complete shipping form', () => {
    const shipping = makeForm(validShipping(), shippingSchema);

    expect(shipping().valid()).toBe(true);
  });

  it('requires the address fields, with their own messages', () => {
    const shipping = makeForm(validShipping({ shippingAddress: emptyAddress() }), shippingSchema);

    expect(shipping().valid()).toBe(false);
    expect(messages(shipping.shippingAddress.firstName)).toEqual(['First name is required']);
    expect(messages(shipping.shippingAddress.countryCode)).toEqual(['Country is required']);
    // Optional fields stay valid when empty.
    expect(shipping.shippingAddress.company().valid()).toBe(true);
    expect(shipping.shippingAddress.province().valid()).toBe(true);
  });

  it('rejects whitespace-only input like an empty field', () => {
    const shipping = makeForm(validShipping({ shippingAddress: address({ city: '   ' }) }), shippingSchema);

    expect(messages(shipping.shippingAddress.city)).toEqual(['City is required']);
  });

  it('requires a valid email', () => {
    expect(messages(makeForm(validShipping({ email: '' }), shippingSchema).email)).toEqual(['Email is required']);
    expect(messages(makeForm(validShipping({ email: 'not-an-email' }), shippingSchema).email)).toEqual([
      'Enter a valid email',
    ]);
  });

  it('only validates the billing address when it differs from shipping', () => {
    const same = makeForm(validShipping({ billingSameAsShipping: true }), shippingSchema);
    expect(same().valid()).toBe(true);

    const separate = makeForm(validShipping({ billingSameAsShipping: false }), shippingSchema);
    expect(separate().valid()).toBe(false);
    expect(messages(separate.billingAddress.lastName)).toEqual(['Last name is required']);
  });

  it('requires a delivery method', () => {
    const delivery = makeForm({ shippingOptionId: '' }, deliverySchema);

    expect(messages(delivery.shippingOptionId)).toEqual(['Select a delivery method']);
  });

  it('builds a trimmed update body, copying shipping into billing when they are the same', () => {
    const body = toUpdateCartBody(
      validShipping({ email: ' ada@example.com ', phone: ' 123 ', shippingAddress: address({ city: ' Copenhagen ' }) }),
    );

    expect(body.email).toBe('ada@example.com');
    expect(body.shipping_address).toMatchObject({ city: 'Copenhagen', phone: '123' });
    expect(body.billing_address).toMatchObject({ first_name: 'Ada', city: 'Copenhagen' });
  });

  it('uses the separate billing address when one is given', () => {
    const body = toUpdateCartBody(
      validShipping({ billingSameAsShipping: false, billingAddress: address({ city: 'Aarhus' }) }),
    );

    expect(body.billing_address).toMatchObject({ city: 'Aarhus' });
  });
});
