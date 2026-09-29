import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { type FieldTree, FormField } from '@angular/forms/signals';
import { type AutocompleteOption, OkklyAutocomplete, OkklyTextField } from '@okkly/angular';
import type { HttpTypes } from '@medusajs/types';
import { type AddressModel, visibleError } from '../../checkout-forms';

/**
 * The fields of one postal address, bound to an `AddressModel` subtree of a
 * parent Signal Form — used for both the shipping and the billing address.
 */
@Component({
  selector: 'app-address-fields',
  imports: [FormField, OkklyAutocomplete, OkklyTextField],
  template: `
    <okkly-text-field
      label="First name"
      [formField]="address().firstName"
      [fullWidth]="true"
      [error]="!!error(address().firstName)"
      [helperText]="error(address().firstName) ?? undefined"
    />
    <okkly-text-field
      label="Last name"
      [formField]="address().lastName"
      [fullWidth]="true"
      [error]="!!error(address().lastName)"
      [helperText]="error(address().lastName) ?? undefined"
    />
    <okkly-text-field
      label="Address"
      [formField]="address().address1"
      [fullWidth]="true"
      [error]="!!error(address().address1)"
      [helperText]="error(address().address1) ?? undefined"
    />
    <okkly-text-field label="Company" [formField]="address().company" [fullWidth]="true" />
    <okkly-text-field
      label="Postal code"
      [formField]="address().postalCode"
      [fullWidth]="true"
      [error]="!!error(address().postalCode)"
      [helperText]="error(address().postalCode) ?? undefined"
    />
    <okkly-text-field
      label="City"
      [formField]="address().city"
      [fullWidth]="true"
      [error]="!!error(address().city)"
      [helperText]="error(address().city) ?? undefined"
    />
    <!--
      Not [formField]: the autocomplete's value is \`string | string[] | null\`
      (it also does multi-select), so it doesn't fit a \`string\` field as a
      FormValueControl. The field still owns the value and its validation —
      this just bridges the two types.
    -->
    <okkly-autocomplete
      label="Country"
      [options]="countryOptions()"
      [value]="address().countryCode().value() || null"
      (valueChange)="setCountry($event)"
      [inputValue]="countryInput()"
      (inputValueChange)="countryInput.set($event)"
      [required]="true"
      [fullWidth]="true"
      [disableClearable]="true"
      [error]="!!error(address().countryCode)"
      [helperText]="error(address().countryCode) ?? undefined"
    />
    <okkly-text-field label="State / Province" [formField]="address().province" [fullWidth]="true" />
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--okkly-space-4);
      width: 100%;
    }

    @media (max-width: 640px) {
      :host {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressFields {
  readonly address = input.required<FieldTree<AddressModel>>();
  readonly countries = input.required<HttpTypes.StoreRegionCountry[]>();

  protected readonly error = visibleError;

  protected readonly countryOptions = computed<AutocompleteOption[]>(() =>
    this.countries().map((country) => ({
      value: country.iso_2 ?? '',
      label: country.display_name ?? country.iso_2 ?? '',
    })),
  );

  /**
   * The text shown in the country input. `okkly-autocomplete` only fills it
   * in when the visitor picks an option, not for a value set from outside —
   * so a country prefilled from the cart would show an empty field. This
   * resets to the selected country's label whenever the value changes, and
   * otherwise follows what the visitor types.
   */
  protected readonly countryInput = linkedSignal(() => {
    const code = this.address().countryCode().value();
    return this.countryOptions().find((option) => option.value === code)?.label ?? '';
  });

  protected setCountry(value: string | string[] | null): void {
    const field = this.address().countryCode();
    field.value.set(typeof value === 'string' ? value : '');
    field.markAsTouched();
  }
}
