import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// 4-box numeric PIN input. Ported from PremiumDocSite's pin-input
// (auto-advance, paste, backspace nav). Inline styles flattened to plain CSS.
@Component({
  selector: 'app-pin-input',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pin-input-container" [class.pin-input--error]="hasError">
      <div
        *ngFor="let slot of digitSlots; let i = index; trackBy: trackByIndex"
        class="pin-box-wrap"
        [class.pin-box-wrap--active]="focusedIndex === i && !digits[i]"
      >
        <input
          #pinBox
          type="tel"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="1"
          [attr.aria-label]="'PIN digit ' + (i + 1) + ' of ' + length"
          [disabled]="disabled"
          (input)="onInput($event, i)"
          (keydown)="onKeyDown($event, i)"
          (paste)="onPaste($event, i)"
          (focus)="onFocus($event, i)"
          (blur)="onBlur()"
        />
        <span class="pin-cursor" *ngIf="focusedIndex === i && !digits[i]"></span>
      </div>
    </div>
  `,
  styles: [
    `
      .pin-input-container {
        display: flex;
        gap: 14px;
        justify-content: center;
      }
      .pin-box-wrap {
        position: relative;
        display: inline-flex;
      }
      .pin-cursor {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 2px;
        height: 24px;
        background: #0d9488;
        border-radius: 1px;
        pointer-events: none;
        animation: pin-cursor-blink 1s step-end infinite;
      }
      @keyframes pin-cursor-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
      .pin-input-container input {
        width: 52px;
        height: 52px;
        text-align: center;
        font-size: 1.25rem;
        font-weight: 500;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 14px;
        background: #fff;
        color: #0f172a;
        outline: none;
        transition: all 0.2s ease;
        caret-color: transparent;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        -moz-appearance: textfield;
        -webkit-tap-highlight-color: transparent;
      }
      .pin-input-container input::-webkit-outer-spin-button,
      .pin-input-container input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .pin-input-container input::selection {
        background: transparent;
      }
      .pin-input-container input:focus {
        border-color: rgba(13, 148, 136, 0.5);
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
      }
      .pin-input-container input.filled {
        border-color: rgba(13, 148, 136, 0.35);
        background: rgba(240, 253, 250, 0.9);
      }
      .pin-input-container input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .pin-input--error input {
        border-color: rgba(248, 113, 113, 0.7) !important;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
      }
      .pin-input--error input.filled {
        background: rgba(254, 242, 242, 0.9);
      }
      @media (max-width: 380px) {
        .pin-input-container input {
          width: 46px;
          height: 46px;
          font-size: 1.1rem;
          border-radius: 12px;
        }
        .pin-input-container { gap: 10px; }
      }
    `,
  ],
})
export class PinInputComponent implements AfterViewInit, OnChanges {
  @Input() length = 4;
  @Input() hasError = false;
  @Input() disabled = false;
  @Input() autoFocus = true;
  @Input() reset = 0;

  @Output() pinComplete = new EventEmitter<string>();
  @Output() pinChange = new EventEmitter<string>();

  @ViewChildren('pinBox') pinBoxes!: QueryList<ElementRef<HTMLInputElement>>;

  digits: string[] = [];
  digitSlots: number[] = [];
  focusedIndex = -1;

  constructor() {
    this.initArrays();
  }

  trackByIndex(index: number): number {
    return index;
  }

  ngAfterViewInit(): void {
    if (this.autoFocus) {
      requestAnimationFrame(() => this.focusBox(0));
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['length']) {
      this.initArrays();
    }
    if (changes['reset'] && !changes['reset'].firstChange) {
      this.clear();
    }
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');

    if (!value) {
      input.value = '';
      this.digits[index] = '';
      this.updateFilledClass(index);
      this.emitChange();
      return;
    }

    if (value.length > 1) {
      input.value = '';
      this.fillFromString(value);
      return;
    }

    input.value = value;
    this.digits[index] = value;
    this.updateFilledClass(index);
    this.emitChange();

    if (index < this.length - 1) {
      this.focusBox(index + 1);
    } else {
      this.checkComplete();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const box = this.getBox(index);
      if (this.digits[index]) {
        this.digits[index] = '';
        if (box) box.value = '';
        this.updateFilledClass(index);
        this.emitChange();
      } else if (index > 0) {
        this.digits[index - 1] = '';
        const prevBox = this.getBox(index - 1);
        if (prevBox) prevBox.value = '';
        this.updateFilledClass(index - 1);
        this.emitChange();
        this.focusBox(index - 1);
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.focusBox(index - 1);
    } else if (event.key === 'ArrowRight' && index < this.length - 1) {
      this.focusBox(index + 1);
    }
  }

  onPaste(event: ClipboardEvent, _index: number): void {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') || '').replace(/\D/g, '');
    if (pasted) this.fillFromString(pasted);
  }

  onFocus(event: FocusEvent, index: number): void {
    this.focusedIndex = index;
    const input = event.target as HTMLInputElement;
    input.select();
  }

  onBlur(): void {
    this.focusedIndex = -1;
  }

  clear(): void {
    this.digits = new Array(this.length).fill('');
    this.syncAllBoxes();
    this.emitChange();
    requestAnimationFrame(() => this.focusBox(0));
  }

  getValue(): string {
    return this.digits.join('');
  }

  // -- private helpers --

  private initArrays(): void {
    this.digits = new Array(this.length).fill('');
    this.digitSlots = Array.from({ length: this.length }, (_, i) => i);
  }

  private getBox(index: number): HTMLInputElement | null {
    const boxes = this.pinBoxes?.toArray();
    return boxes?.[index]?.nativeElement || null;
  }

  private updateFilledClass(index: number): void {
    const box = this.getBox(index);
    if (!box) return;
    if (this.digits[index]) box.classList.add('filled');
    else box.classList.remove('filled');
  }

  private fillFromString(str: string): void {
    const boxes = this.pinBoxes?.toArray() || [];
    for (let i = 0; i < this.length; i++) {
      this.digits[i] = str[i] || '';
      if (boxes[i]) {
        boxes[i].nativeElement.value = this.digits[i];
        if (this.digits[i]) boxes[i].nativeElement.classList.add('filled');
        else boxes[i].nativeElement.classList.remove('filled');
      }
    }
    this.emitChange();

    const lastFilled = Math.min(str.length, this.length) - 1;
    if (lastFilled < this.length - 1) {
      this.focusBox(lastFilled + 1);
    } else {
      this.focusBox(lastFilled);
      this.checkComplete();
    }
  }

  private syncAllBoxes(): void {
    const boxes = this.pinBoxes?.toArray() || [];
    this.digits.forEach((d, i) => {
      if (boxes[i]) {
        boxes[i].nativeElement.value = d;
        if (d) boxes[i].nativeElement.classList.add('filled');
        else boxes[i].nativeElement.classList.remove('filled');
      }
    });
  }

  private focusBox(index: number): void {
    const box = this.getBox(index);
    if (box) box.focus();
  }

  private emitChange(): void {
    this.pinChange.emit(this.getValue());
  }

  private checkComplete(): void {
    const val = this.getValue();
    if (val.length === this.length) {
      this.pinComplete.emit(val);
    }
  }
}
