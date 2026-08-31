import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let uid = 0;

/**
 * Replaces PrimeNG's `p-calendar` (1 usage: date of birth in the profile form).
 *
 * v1 set `[readonlyInput]="true"`, i.e. typing was already forbidden and the
 * only way to pick a date was the popup. A native <input type="date"> is
 * therefore a strict improvement: same constraint, platform picker inside the
 * Android WebView, no overlay code, prerender-safe.
 *
 * THE IMPORTANT PART is the boundary. The form model is a `Date | null`
 * (profile.component.ts parses and re-serialises it), while <input type="date">
 * speaks ISO yyyy-mm-dd. Both conversions happen HERE, so profile.component.ts
 * needs no changes and keeps producing a byte-identical PUT payload.
 *
 * Dates are constructed in LOCAL time. `new Date('2001-05-04')` parses as UTC
 * and can resolve to the previous day west of Greenwich — a real off-by-one on
 * a date of birth.
 */
@Component({
  selector: 'ds-date-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateFieldComponent), multi: true }],
  template: `
    <div class="w-full">
      @if (label()) {
        <label [attr.for]="id" class="block text-sm font-medium text-content mb-1.5">
          {{ label() }}@if (required()) { <span class="text-danger">*</span> }
        </label>
      }
      <input
        [id]="id"
        type="date"
        [value]="value"
        [attr.max]="max()"
        [attr.min]="min()"
        [disabled]="disabled"
        (input)="onInput($event)"
        (blur)="onTouched()"
        [class.border-danger]="!!error()"
        class="w-full h-12 rounded-lg bg-surface-2/60 border border-line/[15%] px-3.5 text-base text-content
               transition-all duration-150 touch-manipulation
               focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25
               disabled:opacity-50" />
      @if (error()) { <p class="mt-1.5 text-xs text-danger" role="alert">{{ error() }}</p> }
      @else if (hint()) { <p class="mt-1.5 text-xs text-muted">{{ hint() }}</p> }
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class DateFieldComponent implements ControlValueAccessor {
  protected id = `ds-date-${++uid}`;
  label = input('');
  hint = input('');
  error = input('');
  required = input(false);
  /** ISO yyyy-mm-dd bounds, e.g. max = today for a date of birth. */
  min = input<string | null>(null);
  max = input<string | null>(null);

  protected value = ''; // always ISO yyyy-mm-dd, or empty
  protected disabled = false;
  private onChange: (v: Date | null) => void = () => {};
  protected onTouched: () => void = () => {};

  protected onInput(e: Event): void {
    this.value = (e.target as HTMLInputElement).value;
    this.onChange(this.toDate(this.value));
  }

  writeValue(v: Date | string | null): void {
    this.value = this.toIso(v);
  }
  registerOnChange(fn: (v: Date | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }

  /** Date or parseable string -> ISO yyyy-mm-dd in LOCAL time, else empty. */
  private toIso(v: Date | string | null): string {
    if (!v) return '';
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** ISO yyyy-mm-dd -> Date at LOCAL midnight, else null. */
  private toDate(s: string): Date | null {
    if (!s) return null;
    const parts = s.split('-').map(Number);
    const [y, m, d] = parts;
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
}
