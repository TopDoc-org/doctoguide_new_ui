import { ChangeDetectionStrategy, Component, computed, forwardRef, input, model, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

let uid = 0;

/**
 * A checkbox for a value that is committed with the rest of a form — consent,
 * "remember me", a multi-select filter applied on submit. For a setting that
 * takes effect the moment it is flipped, use `ds-switch`.
 *
 * Two ways to drive it, and they are not meant to be combined on one instance:
 * `[(ngModel)]` / a form control through the CVA below, or `[(checked)]` when
 * the caller already owns the boolean. See `ds-switch` for why both exist.
 *
 * The label body is projected. `label()` covers the plain-text case; a consent
 * paragraph with links in it goes through `<ng-content>`. Because this
 * component renders the `<label>` itself, the caller must NOT wrap it in
 * another one — nested labels break click targeting.
 *
 * Native `<input type="checkbox">` visually replaced, same as `ds-switch`: the
 * input stays in the DOM (sr-only) so keyboard, forms and AT keep working, and
 * the box is drawn from its `:checked` state via `peer-*`.
 */
@Component({
  selector: 'ds-checkbox',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CheckboxComponent), multi: true }],
  template: `
    <label
      [attr.for]="id"
      class="flex items-start gap-3 min-h-[44px] py-1.5 cursor-pointer select-none"
      [class.opacity-50]="isDisabled()"
      [class.pointer-events-none]="isDisabled()">
      <span class="relative inline-flex shrink-0 mt-0.5">
        <input
          [id]="id"
          type="checkbox"
          class="peer sr-only"
          [checked]="checked()"
          [disabled]="isDisabled()"
          [attr.aria-invalid]="error() ? true : null"
          [attr.aria-describedby]="describedBy()"
          (change)="toggle($event)"
          (blur)="onTouched()" />
        <span
          class="grid place-items-center h-5 w-5 rounded-[6px] border-2 border-content/25 bg-surface
                 transition-colors duration-fast ease-standard
                 peer-checked:border-teal-600 peer-checked:bg-teal-600
                 peer-focus-visible:outline peer-focus-visible:outline-2
                 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-500">
          <!-- Tick is always rendered and revealed by opacity, not created on
               check: mounting an SVG mid-interaction costs a layout pass and
               makes the box flicker on a slow device. -->
          <ds-icon
            name="check"
            [size]="14"
            [strokeWidth]="3"
            class="text-white opacity-0 transition-opacity duration-fast" />
        </span>
      </span>

      <span class="min-w-0">
        @if (label()) {
          <span class="block text-sm text-content">{{ label() }}@if (required()) { <span class="text-danger">*</span> }</span>
        }
        <ng-content />
        @if (error()) {
          <span [id]="id + '-error'" class="block text-xs text-danger" role="alert">{{ error() }}</span>
        } @else if (hint()) {
          <span [id]="id + '-hint'" class="block text-xs text-muted">{{ hint() }}</span>
        }
      </span>
    </label>
  `,
  styles: [
    `
      :host { display: block; }

      /* Revealing the tick has to happen HERE, not with a peer-checked:
         utility on the ds-icon element. NOTE: no backticks in this comment —
         it lives inside a template literal, where one would end the string and
         leave the compiler with "styles at position 1 is not a string".
         peer-* compiles to a sibling
         combinator, and the icon is not a sibling of the input — it is inside
         the box span, which is. This rule crosses that boundary; the utility
         silently would not, which is the kind of thing that looks correct in
         the template and never fires. */
      :host input:checked ~ span ds-icon { opacity: 1; }
    `,
  ],
})
export class CheckboxComponent implements ControlValueAccessor {
  protected readonly id = `ds-checkbox-${++uid}`;

  readonly label = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly required = input(false);

  /** Two-way, for callers that own the boolean and skip the forms module. */
  readonly checked = model(false);

  /**
   * Kept apart from the forms module's `setDisabledState` and OR'd with it, so
   * a CVA write cannot clear a caller's `[disabled]` and vice versa.
   */
  readonly disabled = input(false);
  private readonly cvaDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());

  private onChange: (v: boolean) => void = () => {};
  protected onTouched: () => void = () => {};

  protected describedBy(): string | null {
    if (this.error()) return `${this.id}-error`;
    if (this.hint()) return `${this.id}-hint`;
    return null;
  }

  protected toggle(event: Event): void {
    const next = (event.target as HTMLInputElement).checked;
    this.checked.set(next);
    this.onChange(next);
  }

  writeValue(v: boolean | null): void { this.checked.set(!!v); }
  registerOnChange(fn: (v: boolean) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.cvaDisabled.set(d); }
}
