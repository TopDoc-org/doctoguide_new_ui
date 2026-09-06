import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let uid = 0;

export interface RadioOption {
  label: string;
  value: string;
  hint?: string;
  disabled?: boolean;
}

/**
 * A single-choice group. Options are passed as data, not projected, which is
 * the opposite of `ds-dropdown-menu` and deliberate: every radio in a group is
 * the same shape by definition, so projection would only give call sites a way
 * to make them inconsistent.
 *
 * Rendered as CARDS, not as bare dots with labels beside them. The whole card
 * is the hit area, which on a phone is the difference between a 20px target and
 * a 44px one — and a group of two or three options is usually the primary
 * choice on the screen, so it earns the space.
 *
 * `<input type="radio">` with a shared `name` gives arrow-key navigation, the
 * one-tab-stop-per-group behaviour and `role="radiogroup"` semantics natively.
 * A hand-rolled version of that is a lot of code to arrive back where the
 * platform already was.
 */
@Component({
  selector: 'ds-radio-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RadioGroupComponent), multi: true }],
  template: `
    <fieldset [disabled]="disabled()" class="min-w-0" [class.opacity-50]="disabled()">
      @if (label()) {
        <legend class="mb-2 block text-sm font-medium text-content">
          {{ label() }}@if (required()) { <span class="text-danger">*</span> }
        </legend>
      }

      <div [class]="listClass()">
        @for (opt of options(); track opt.value) {
          <label
            [attr.for]="id + '-' + opt.value"
            class="relative flex items-start gap-3 min-h-[44px] cursor-pointer select-none
                   rounded-xl border border-line/[12%] bg-surface p-3.5
                   transition-all duration-fast ease-standard
                   hover:border-line/25
                   has-[:checked]:border-teal-600 has-[:checked]:bg-teal-500/[7%]
                   has-[:focus-visible]:outline has-[:focus-visible]:outline-2
                   has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal-500"
            [class.pointer-events-none]="opt.disabled"
            [class.opacity-50]="opt.disabled">
            <input
              [id]="id + '-' + opt.value"
              type="radio"
              [name]="id"
              class="peer sr-only"
              [value]="opt.value"
              [checked]="value() === opt.value"
              [disabled]="!!opt.disabled"
              (change)="select(opt.value)"
              (blur)="onTouched()" />

            <span
              class="mt-0.5 grid shrink-0 place-items-center h-5 w-5 rounded-full
                     border-2 border-content/25 transition-colors duration-fast
                     peer-checked:border-teal-600">
              <span
                class="h-2.5 w-2.5 rounded-full bg-teal-600 scale-0 transition-transform duration-fast
                       peer-checked:scale-100"></span>
            </span>

            <span class="min-w-0">
              <span class="block text-sm font-medium text-content">{{ opt.label }}</span>
              @if (opt.hint) {
                <span class="block text-xs text-muted">{{ opt.hint }}</span>
              }
            </span>
          </label>
        }
      </div>

      @if (error()) {
        <p class="mt-1.5 text-xs text-danger" role="alert">{{ error() }}</p>
      } @else if (hint()) {
        <p class="mt-1.5 text-xs text-muted">{{ hint() }}</p>
      }
    </fieldset>
  `,
  styles: [
    `
      :host { display: block; }

      /* Same boundary problem as ds-checkbox's tick: the filled dot sits inside
         the ring span, which is the input's sibling, so peer-checked: cannot
         reach it from the template. (No backticks in here: this comment is
         inside a template literal, and one would close the string.) */
      :host input:checked ~ span > span { transform: scale(1); }
    `,
  ],
})
export class RadioGroupComponent implements ControlValueAccessor {
  protected readonly id = `ds-radio-${++uid}`;

  readonly label = input('');
  readonly options = input<RadioOption[]>([]);
  readonly hint = input('');
  readonly error = input('');
  readonly required = input(false);
  /** `row` wraps the cards inline — for two or three short options. */
  readonly layout = input<'column' | 'row'>('column');

  protected readonly value = signal<string | null>(null);
  protected readonly disabled = signal(false);

  private onChange: (v: string | null) => void = () => {};
  protected onTouched: () => void = () => {};

  protected listClass(): string {
    return this.layout() === 'row'
      ? 'flex flex-wrap gap-2 [&>label]:flex-1 [&>label]:min-w-[8rem]'
      : 'flex flex-col gap-2';
  }

  protected select(v: string): void {
    this.value.set(v);
    this.onChange(v);
  }

  writeValue(v: string | null): void { this.value.set(v ?? null); }
  registerOnChange(fn: (v: string | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled.set(d); }
}
