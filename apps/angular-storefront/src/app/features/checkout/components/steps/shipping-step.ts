import { ChangeDetectionStrategy, Component, computed, forwardRef, inject, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { OkklyCheckbox, OkklyTextField, OkklyTypography } from '@okkly/angular';
import { CartStore } from '../../../../shared/stores/cart.store';
import { shippingSchema, toShippingModel, toUpdateCartBody, visibleError } from '../../checkout-forms';
import { CHECKOUT_STEP, CheckoutPage, type CheckoutStepHandle } from '../../checkout-page';
import { AddressFields } from '../address-fields/address-fields';

/** Ported from the Vue storefront's `ShippingStep`: contact details plus shipping (and billing) address. */
@Component({
  selector: 'app-shipping-step',
  imports: [AddressFields, FormField, OkklyCheckbox, OkklyTextField, OkklyTypography],
  providers: [{ provide: CHECKOUT_STEP, useExisting: forwardRef(() => ShippingStep) }],
  template: `
    <h1 okklyTypography variant="h2">Shipping address</h1>

    <form class="step-form" novalidate (submit)="$event.preventDefault(); submit()">
      <app-address-fields [address]="form.shippingAddress" [countries]="page.countries()" />

      <div class="step-form__pair">
        <okkly-text-field
          label="Email"
          type="email"
          [formField]="form.email"
          [fullWidth]="true"
          [error]="!!error(form.email)"
          [helperText]="error(form.email) ?? undefined"
        />
        <okkly-text-field label="Phone" type="tel" [formField]="form.phone" [fullWidth]="true" />
      </div>

      <!-- Not [formField]: okkly-checkbox's \`checked\` is a plain input, not a model. -->
      <okkly-checkbox
        label="Billing address same as shipping address"
        [checked]="form.billingSameAsShipping().value()"
        (checkedChange)="form.billingSameAsShipping().value.set($event)"
      />

      @if (!form.billingSameAsShipping().value()) {
        <span okklyTypography variant="label-md">Billing address</span>
        <app-address-fields [address]="form.billingAddress" [countries]="page.countries()" />
      }

      @if (serverError(); as message) {
        <p okklyTypography variant="body-sm" color="danger">{{ message }}</p>
      }
    </form>
  `,
  styleUrl: './step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShippingStep implements CheckoutStepHandle {
  protected readonly page = inject(CheckoutPage);
  private readonly cartStore = inject(CartStore);

  protected readonly error = visibleError;

  // The step only renders once the cart has loaded, so it seeds from it once.
  private readonly model = signal(toShippingModel(this.page.cart()!));
  protected readonly form = form(this.model, shippingSchema);

  readonly isPending = computed(() => this.form().submitting());

  /** The API's answer to the last submit, attached to the form by `submit()`. */
  protected readonly serverError = computed(
    () => this.form().errors().find((error) => error.kind === 'server')?.message ?? null,
  );

  /**
   * Edited but not saved. `submitting` excludes the save itself: moving on
   * to Delivery happens inside the submit action, while the form is still
   * dirty — that navigation must not ask.
   */
  hasUnsavedChanges(): boolean {
    return this.form().dirty() && !this.form().submitting();
  }

  async submit(): Promise<void> {
    await submit(this.form, async () => {
      const result = await this.cartStore.updateCart(toUpdateCartBody(this.model()));
      if (!result.ok) return { kind: 'server', message: result.error };

      await this.page.goToStep('delivery');
      return undefined;
    });
  }
}
