import { ChangeDetectionStrategy, Component, computed, effect, forwardRef, inject, signal, untracked } from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { OkklyRadio, OkklyRadioGroup, OkklySkeleton, OkklyTypography } from '@okkly/angular';
import { CartStore } from '../../../../shared/stores/cart.store';
import { PricePipe } from '../../../../shared/pipes/price-pipe';
import { ShippingOptionsStore } from '../../../../shared/stores/shipping-options.store';
import { deliverySchema, visibleError } from '../../checkout-forms';
import { CHECKOUT_STEP, CheckoutPage, type CheckoutStepHandle } from '../../checkout-page';

/** Ported from the Vue storefront's `DeliveryStep`: picks the cart's shipping option. */
@Component({
  selector: 'app-delivery-step',
  imports: [OkklyRadio, OkklyRadioGroup, OkklySkeleton, OkklyTypography, PricePipe],
  providers: [{ provide: CHECKOUT_STEP, useExisting: forwardRef(() => DeliveryStep) }],
  template: `
    <h1 okklyTypography variant="h2">Delivery</h1>

    <form class="step-form" novalidate (submit)="$event.preventDefault(); submit()">
      <div class="step-form__intro">
        <span okklyTypography variant="label-md">Shipping method</span>
        <span okklyTypography variant="body-sm" color="muted">How would you like your order delivered</span>
      </div>

      @if (optionsPending()) {
        <div class="step-options" aria-busy="true">
          <okkly-skeleton variant="rectangular" height="4.5rem" />
          <okkly-skeleton variant="rectangular" height="4.5rem" />
        </div>
      } @else {
        <!--
          Not [formField]: the group's value is \`string | undefined\`, which
          doesn't fit this \`string\` field as a FormValueControl.
        -->
        <okkly-radio-group
          class="step-options"
          label="Shipping method"
          [value]="form.shippingOptionId().value()"
          (valueChange)="form.shippingOptionId().value.set($event ?? '')"
        >
          @for (option of options.shippingOptions(); track option.id) {
            <label class="step-option" [class.step-option--selected]="option.id === form.shippingOptionId().value()">
              <okkly-radio [value]="option.id" [attr.aria-label]="option.name" />
              <span okklyTypography variant="label-md" class="step-option__name">{{ option.name }}</span>
              <span okklyTypography variant="label-md">{{ option.calculated_price?.calculated_amount ?? 0 | price: currencyCode() }}</span>
            </label>
          }
        </okkly-radio-group>
      }

      @if (error(form.shippingOptionId) ?? serverError() ?? options.error(); as message) {
        <p okklyTypography variant="body-sm" color="danger">{{ message }}</p>
      }
    </form>
  `,
  styleUrl: './step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryStep implements CheckoutStepHandle {
  private readonly page = inject(CheckoutPage);
  private readonly cartStore = inject(CartStore);
  protected readonly options = inject(ShippingOptionsStore);

  protected readonly error = visibleError;
  protected readonly currencyCode = computed(() => this.page.cart()?.currency_code ?? 'usd');

  private readonly model = signal({
    shippingOptionId: this.page.cart()?.shipping_methods?.[0]?.shipping_option_id ?? '',
  });
  protected readonly form = form(this.model, deliverySchema);

  readonly isPending = computed(() => this.form().submitting());

  protected readonly serverError = computed(
    () => this.form().errors().find((error) => error.kind === 'server')?.message ?? null,
  );

  /** Options loaded for a different cart (or not at all) aren't this cart's yet. */
  protected readonly optionsPending = computed(
    () =>
      this.options.error() === null &&
      (this.options.cartId() !== this.page.cart()?.id || this.options.loading()),
  );

  constructor() {
    const cartId = this.page.cart()?.id;
    // Prices depend on the cart's contents and address, which may have
    // changed since the options were last loaded.
    if (cartId) this.options.refresh(cartId);

    // Nothing is pre-selected until the options arrive — default to the
    // first one once they do, rather than leaving an obvious choice empty.
    effect(() => {
      const first = this.optionsPending() ? undefined : this.options.shippingOptions()[0];
      const field = untracked(() => this.form.shippingOptionId());

      if (first && !untracked(field.value)) {
        field.value.set(first.id);
      }
    });
  }

  async submit(): Promise<void> {
    await submit(this.form, async () => {
      const result = await this.cartStore.addShippingMethod({ option_id: this.model().shippingOptionId });
      if (!result.ok) return { kind: 'server', message: result.error };

      await this.page.goToStep('payment');
      return undefined;
    });
  }
}
