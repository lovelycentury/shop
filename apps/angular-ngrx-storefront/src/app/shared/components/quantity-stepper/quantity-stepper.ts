import { ChangeDetectionStrategy, Component, booleanAttribute, input, model } from '@angular/core';
import { OkklyIcon } from '@okkly/angular';
import { iconMinus, iconPlus } from '@okkly/icons';

/** A "− n +" quantity control; bind it with `[(value)]`. */
@Component({
  selector: 'app-quantity-stepper',
  imports: [OkklyIcon],
  template: `
    <button
      type="button"
      class="quantity-stepper__btn"
      [disabled]="disabled() || value() <= min()"
      aria-label="Decrease quantity"
      (click)="decrease()"
    >
      <okkly-icon [icon]="iconMinus" fontSize="small" />
    </button>
    <span class="quantity-stepper__value">{{ value() }}</span>
    <button
      type="button"
      class="quantity-stepper__btn"
      [disabled]="disabled()"
      aria-label="Increase quantity"
      (click)="increase()"
    >
      <okkly-icon [icon]="iconPlus" fontSize="small" />
    </button>
  `,
  styles: `
    :host {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      overflow: hidden;
      border: 1px solid var(--okkly-border-default);
      border-radius: var(--okkly-radius-md);
    }

    .quantity-stepper__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--okkly-space-2);
      border: none;
      background: none;
      color: var(--okkly-text-primary);
      cursor: pointer;
    }

    .quantity-stepper__btn:hover:not(:disabled) {
      background: var(--okkly-glass-fill);
    }

    .quantity-stepper__btn:disabled {
      color: var(--okkly-text-muted);
      cursor: not-allowed;
    }

    .quantity-stepper__value {
      min-width: 1.5rem;
      padding: 0 var(--okkly-space-1);
      text-align: center;
      font-size: 0.8125rem;
      font-weight: var(--okkly-font-weight-medium);
      color: var(--okkly-text-primary);
    }
  `,
  host: { role: 'group', 'aria-label': 'Quantity' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuantityStepper {
  readonly value = model.required<number>();
  readonly min = input(1);
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly iconMinus = iconMinus;
  protected readonly iconPlus = iconPlus;

  protected decrease(): void {
    this.value.update((value) => Math.max(this.min(), value - 1));
  }

  protected increase(): void {
    this.value.update((value) => value + 1);
  }
}
