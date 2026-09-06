import { ChangeDetectionStrategy, Component, computed, forwardRef, input, model, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let uid = 0;

/**
 * A boolean toggle for a setting that takes effect IMMEDIATELY — dark mode,
 * notifications, a filter. If the value is only committed when a form is
 * submitted, use `ds-checkbox`; that difference is the whole reason both exist.
 *
 * A real `<input type="checkbox">` under a visual track, not a `div` with
 * `role="switch"`: the native control brings keyboard activation, form
 * participation, the label association and the AT semantics for free, and
 * `role="switch"` on top of it is the one thing it does not already say.
 *
 * Two ways to drive it, and they are not meant to be combined on one instance:
 * `[(ngModel)]` / a form control through the CVA below, or `[(checked)]` when
 * the caller already owns the boolean (a signal, a field the row was rendered
 * from). The second exists because most console rows toggle a row of DATA, not
 * a form field, and reaching for `FormsModule` to bind one boolean is worse
 * than a model input.
 *
 * The label body is projected. `label()` / `hint()` cover the plain-text case;
 * anything with a badge, a price or a link goes through `<ng-content>` — and
 * because this component renders the `<label>` itself, the caller must NOT
 * wrap it in another one. Nested labels break click targeting.
 *
 * Internal state is a signal rather than the plain field the older ds-* CVAs
 * use. `writeValue` is called by the forms module outside this component's
 * change detection, and an OnPush view has no reason to re-render for a plain
 * field write — the older components get away with it because Angular happens
 * to run CD around the form's own events. A signal makes it correct rather
 * than lucky.
 */
@Component({
  selector: 'ds-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SwitchComponent), multi: true }],
  template: `
    <label
      [attr.for]="id"
      class="flex items-center gap-3 min-h-[44px] cursor-pointer select-none"
      [class.opacity-50]="isDisabled()"
      [class.pointer-events-none]="isDisabled()">
      <span class="relative inline-flex shrink-0">
        <input
          [id]="id"
          type="checkbox"
          role="switch"
          class="peer sr-only"
          [checked]="checked()"
          [disabled]="isDisabled()"
          [attr.aria-describedby]="hint() ? id + '-hint' : null"
          (change)="toggle($event)"
          (blur)="onTouched()" />
        <!-- Track -->
        <span
          class="block h-7 w-12 rounded-full bg-content/20 transition-colors duration-base ease-standard
                 peer-checked:bg-teal-600
                 peer-focus-visible:outline peer-focus-visible:outline-2
                 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-500"></span>
        <!-- Thumb. Positioned, not translated, so it stays crisp at both ends. -->
        <span
          class="pointer-events-none absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-surface shadow-e1
                 transition-transform duration-base ease-standard
                 peer-checked:translate-x-5"></span>
      </span>

      <span class="min-w-0">
        @if (label()) {
          <span class="block text-sm font-medium text-content">{{ label() }}</span>
        }
        <ng-content />
        @if (hint()) {
          <span [id]="id + '-hint'" class="block text-xs text-muted">{{ hint() }}</span>
        }
      </span>
    </label>
  `,
  styles: [`:host { display: block; }`],
})
export class SwitchComponent implements ControlValueAccessor {
  protected readonly id = `ds-switch-${++uid}`;

  readonly label = input('');
  readonly hint = input('');

  /** Two-way, for callers that own the boolean and skip the forms module. */
  readonly checked = model(false);

  /**
   * `disabled` has two sources that must not overwrite each other: this input
   * and the forms module's `setDisabledState`. They are kept apart and OR'd,
   * so a CVA write cannot clear a caller's `[disabled]` and vice versa.
   */
  readonly disabled = input(false);
  private readonly cvaDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());

  private onChange: (v: boolean) => void = () => {};
  protected onTouched: () => void = () => {};

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
