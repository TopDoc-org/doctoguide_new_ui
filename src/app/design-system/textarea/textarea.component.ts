import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let uid = 0;

@Component({
  selector: 'ds-textarea',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextareaComponent), multi: true }],
  template: `
    <div class="w-full">
      @if (label()) {
        <label [attr.for]="id" class="block text-sm font-medium text-content mb-1.5">
          {{ label() }}@if (required()) { <span class="text-danger">*</span> }
        </label>
      }
      <textarea
        [id]="id"
        [value]="value"
        [rows]="rows()"
        [placeholder]="placeholder()"
        [attr.maxlength]="maxlength()"
        [disabled]="disabled"
        (input)="onInput($event)"
        (blur)="onTouched()"
        [class.border-danger]="!!error()"
        class="w-full rounded-lg bg-surface-2/60 border border-line/[15%] px-3.5 py-3 text-base text-content
               placeholder:text-muted transition-all duration-150 resize-y
               focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25
               disabled:opacity-50"></textarea>
      <div class="mt-1.5 flex items-start justify-between gap-3">
        <div class="min-w-0">
          @if (error()) { <p class="text-xs text-danger" role="alert">{{ error() }}</p> }
          @else if (hint()) { <p class="text-xs text-muted">{{ hint() }}</p> }
        </div>
        @if (maxlength()) {
          <span class="shrink-0 text-xs tabular-nums text-muted">{{ value.length }}/{{ maxlength() }}</span>
        }
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class TextareaComponent implements ControlValueAccessor {
  protected id = `ds-textarea-${++uid}`;
  label = input('');
  placeholder = input('');
  hint = input('');
  error = input('');
  required = input(false);
  rows = input(4);
  maxlength = input<number | null>(null);

  protected value = '';
  protected disabled = false;
  private onChange: (v: string) => void = () => {};
  protected onTouched: () => void = () => {};

  protected onInput(e: Event): void {
    this.value = (e.target as HTMLTextAreaElement).value;
    this.onChange(this.value);
  }
  writeValue(v: string): void { this.value = v ?? ''; }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }
}
