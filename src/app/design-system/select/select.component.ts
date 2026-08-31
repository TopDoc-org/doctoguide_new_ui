import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

let uid = 0;

export interface SelectOption {
  label: string;
  value: string;
}

/**
 * Replaces PrimeNG's `p-dropdown` (2 usages: gender + blood group in the
 * profile form).
 *
 * A NATIVE <select> on purpose, not a custom listbox:
 *  - it is SSR/prerender-safe with no portal or overlay machinery;
 *  - keyboard and screen-reader behaviour is correct for free;
 *  - inside the Android WebView it gets the platform picker, which is a far
 *    better mobile experience than any div-based dropdown.
 *
 * `[showClear]` from p-dropdown maps to the empty-value placeholder option:
 * selecting it emits null, which is what p-dropdown's clear button produced.
 */
@Component({
  selector: 'ds-select',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true }],
  template: `
    <div class="w-full">
      @if (label()) {
        <label [attr.for]="id" class="block text-sm font-medium text-content mb-1.5">
          {{ label() }}@if (required()) { <span class="text-danger">*</span> }
        </label>
      }
      <div class="relative">
        <select
          [id]="id"
          [value]="value"
          [disabled]="disabled"
          (change)="onSelect($event)"
          (blur)="onTouched()"
          [class.text-muted]="!value"
          [class.border-danger]="!!error()"
          class="w-full h-12 appearance-none rounded-lg bg-surface-2/60 border border-line/[15%]
                 pl-3.5 pr-10 text-base text-content transition-all duration-150 touch-manipulation
                 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25
                 disabled:opacity-50">
          <option value="">{{ placeholder() }}</option>
          @for (opt of options(); track opt.value) {
            <option [value]="opt.value">{{ opt.label }}</option>
          }
        </select>
        <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
          <ds-icon name="chevron-down" [size]="18" />
        </span>
      </div>
      @if (error()) { <p class="mt-1.5 text-xs text-danger" role="alert">{{ error() }}</p> }
      @else if (hint()) { <p class="mt-1.5 text-xs text-muted">{{ hint() }}</p> }
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class SelectComponent implements ControlValueAccessor {
  protected id = `ds-select-${++uid}`;
  label = input('');
  placeholder = input('Select');
  options = input<SelectOption[]>([]);
  hint = input('');
  error = input('');
  required = input(false);

  protected value = '';
  protected disabled = false;
  private onChange: (v: string | null) => void = () => {};
  protected onTouched: () => void = () => {};

  protected onSelect(e: Event): void {
    this.value = (e.target as HTMLSelectElement).value;
    this.onChange(this.value === '' ? null : this.value);
  }
  writeValue(v: string | null): void { this.value = v ?? ''; }
  registerOnChange(fn: (v: string | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }
}
