import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

let uid = 0;

/**
 * Ported from DocTribe. Changes: `text-coral-400` -> `text-danger` (coral does
 * not exist in this palette), dead `/15` alphas -> `/[15%]`, and lucide-icon
 * swapped for ds-icon.
 *
 * `text-base` (16px) on the control is load-bearing on mobile, not a style
 * choice: iOS Safari auto-zooms the viewport when a focused input's font-size
 * is under 16px, and there is no way back out of that zoom.
 */
@Component({
  selector: 'ds-input',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => InputComponent), multi: true }],
  template: `
    <div class="w-full">
      @if (label()) {
        <label [attr.for]="id" class="block text-sm font-medium text-content mb-1.5">
          {{ label() }}@if (required()) { <span class="text-danger">*</span> }
        </label>
      }
      <div class="relative">
        @if (icon()) {
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <ds-icon [name]="icon()!" [size]="18" />
          </span>
        }
        <input
          [id]="id"
          [type]="reveal() ? 'text' : type()"
          [value]="value"
          [placeholder]="placeholder()"
          [attr.inputmode]="inputmode()"
          [attr.autocomplete]="autocomplete()"
          [disabled]="disabled"
          (input)="onInput($event)"
          (blur)="onTouched()"
          [class.pl-11]="icon()"
          [class.pr-11]="type() === 'password'"
          [class.border-danger]="!!error()"
          class="w-full h-12 rounded-lg bg-surface-2/60 border border-line/[15%] px-3.5 text-base text-content
                 placeholder:text-muted transition-all duration-150 touch-manipulation
                 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25
                 disabled:opacity-50" />
        @if (type() === 'password') {
          <button type="button" (click)="reveal.set(!reveal())"
                  class="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center w-11 h-11 rounded-lg text-muted hover:text-content"
                  [attr.aria-label]="reveal() ? 'Hide password' : 'Show password'">
            <ds-icon [name]="reveal() ? 'eye-off' : 'eye'" [size]="18" />
          </button>
        }
      </div>
      @if (error()) { <p class="mt-1.5 text-xs text-danger" role="alert">{{ error() }}</p> }
      @else if (hint()) { <p class="mt-1.5 text-xs text-muted">{{ hint() }}</p> }
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class InputComponent implements ControlValueAccessor {
  protected id = `ds-input-${++uid}`;
  label = input('');
  placeholder = input('');
  type = input<'text' | 'password' | 'email' | 'tel' | 'number'>('text');
  icon = input<string | null>(null);
  hint = input('');
  error = input('');
  required = input(false);
  inputmode = input<string | null>(null);
  autocomplete = input<string | null>(null);

  protected reveal = signal(false);
  protected value = '';
  protected disabled = false;

  private onChange: (v: string) => void = () => {};
  protected onTouched: () => void = () => {};

  protected onInput(e: Event): void {
    this.value = (e.target as HTMLInputElement).value;
    this.onChange(this.value);
  }
  writeValue(v: string): void { this.value = v ?? ''; }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }
}
