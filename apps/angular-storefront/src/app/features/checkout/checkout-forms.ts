import {
  type FieldTree,
  type PathKind,
  type SchemaPath,
  type SchemaPathRules,
  apply,
  applyWhen,
  email,
  required,
  requiredError,
  schema,
  validate,
} from '@angular/forms/signals';
import type { HttpTypes } from '@medusajs/types';

/**
 * Signal Forms models and schemas for the checkout steps — the Angular
 * counterpart of the Vue storefront's zod `schemas.ts`. Models hold the raw
 * input (every field a string, so an empty field is `''`); trimming happens
 * when a model is turned into an API payload.
 */

/** One postal address — shared shape of the shipping and billing forms. */
export type AddressModel = {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  postalCode: string;
  city: string;
  countryCode: string;
  province: string;
};

export type ShippingModel = {
  email: string;
  phone: string;
  shippingAddress: AddressModel;
  billingSameAsShipping: boolean;
  billingAddress: AddressModel;
};

export type DeliveryModel = {
  shippingOptionId: string;
};

/**
 * What a billing form starts from when "same as shipping" is unchecked —
 * blank rather than a copy of the shipping values, so the fields visibly
 * need filling in.
 */
export const emptyAddress = (): AddressModel => ({
  firstName: '',
  lastName: '',
  company: '',
  address1: '',
  postalCode: '',
  city: '',
  countryCode: '',
  province: '',
});

/**
 * `required` treats `'   '` as filled in; this rejects whitespace-only
 * input too (zod's `.trim().min(1)` in the Vue version). Kept as a separate
 * validator so `required` still marks the field required for the UI.
 */
const requiredText = <K extends PathKind>(path: SchemaPath<string, SchemaPathRules.Supported, K>, message: string) => {
  required(path, { message });
  validate(path, ({ value }) => (value() !== '' && value().trim() === '' ? requiredError({ message }) : null));
};

export const addressSchema = schema<AddressModel>((address) => {
  requiredText(address.firstName, 'First name is required');
  requiredText(address.lastName, 'Last name is required');
  requiredText(address.address1, 'Address is required');
  requiredText(address.postalCode, 'Postal code is required');
  requiredText(address.city, 'City is required');
  requiredText(address.countryCode, 'Country is required');
});

export const shippingSchema = schema<ShippingModel>((form) => {
  requiredText(form.email, 'Email is required');
  email(form.email, { message: 'Enter a valid email' });
  apply(form.shippingAddress, addressSchema);
  // The billing form only exists — and only has to be valid — when it's
  // not just a copy of the shipping address.
  applyWhen(form.billingAddress, ({ valueOf }) => !valueOf(form.billingSameAsShipping), addressSchema);
});

export const deliverySchema = schema<DeliveryModel>((form) => {
  requiredText(form.shippingOptionId, 'Select a delivery method');
});

/** The first error to show under a field — only once the visitor has touched it (or tried to submit). */
export const visibleError = (field: FieldTree<unknown>): string | null => {
  const state = field();
  return state.touched() && state.invalid() ? (state.errors()[0]?.message ?? null) : null;
};

type ApiAddress = Partial<
  Pick<
    HttpTypes.StoreCartAddress,
    'first_name' | 'last_name' | 'company' | 'address_1' | 'postal_code' | 'city' | 'country_code' | 'province'
  >
> | null;

export const toAddressModel = (address: ApiAddress | undefined): AddressModel => ({
  firstName: address?.first_name ?? '',
  lastName: address?.last_name ?? '',
  company: address?.company ?? '',
  address1: address?.address_1 ?? '',
  postalCode: address?.postal_code ?? '',
  city: address?.city ?? '',
  countryCode: address?.country_code ?? '',
  province: address?.province ?? '',
});

export const toApiAddress = (address: AddressModel) => ({
  first_name: address.firstName.trim(),
  last_name: address.lastName.trim(),
  company: address.company.trim(),
  address_1: address.address1.trim(),
  postal_code: address.postalCode.trim(),
  city: address.city.trim(),
  country_code: address.countryCode.trim(),
  province: address.province.trim(),
});

export const toShippingModel = (cart: HttpTypes.StoreCart): ShippingModel => ({
  email: cart.email ?? '',
  phone: cart.shipping_address?.phone ?? '',
  shippingAddress: toAddressModel(cart.shipping_address),
  billingSameAsShipping: true,
  billingAddress: cart.billing_address ? toAddressModel(cart.billing_address) : emptyAddress(),
});

export const toUpdateCartBody = (model: ShippingModel): HttpTypes.StoreUpdateCart => ({
  email: model.email.trim(),
  shipping_address: { ...toApiAddress(model.shippingAddress), phone: model.phone.trim() },
  billing_address: toApiAddress(model.billingSameAsShipping ? model.shippingAddress : model.billingAddress),
});
