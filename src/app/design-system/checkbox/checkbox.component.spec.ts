import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { CheckboxComponent } from './checkbox.component';
import { provideIcons } from '../../core/icons';

/**
 * `ds-checkbox` and `ds-switch` each expose TWO ways to be driven — a
 * `ControlValueAccessor` and a `checked` model — and the two share one internal
 * signal. That sharing is the whole risk: a `writeValue` that lands on the
 * wrong field, or a `[disabled]` input that the forms module overwrites, fails
 * silently and looks like a working control.
 *
 * These are the first component specs in the project; everything else here
 * tests services, routes and utilities. They exist because these two controls
 * now carry the /triage consent gates and the partner console's offer
 * attachment, where a checkbox that shows the wrong state is a real problem
 * rather than a cosmetic one.
 */
@Component({
  standalone: true,
  imports: [CheckboxComponent, FormsModule],
  template: `
    <ds-checkbox
      [(ngModel)]="model"
      [disabled]="hostDisabled()"
      label="Active" />
  `,
})
class NgModelHost {
  model = false;
  readonly hostDisabled = signal(false);
}

@Component({
  standalone: true,
  imports: [CheckboxComponent],
  template: `
    <ds-checkbox [(checked)]="value">
      <span class="projected">I agree</span>
    </ds-checkbox>
  `,
})
class ModelHost {
  value = false;
}

function box(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('input[type="checkbox"]');
}

describe('ds-checkbox', () => {
  // The tick is a ds-icon, and lucide-angular THROWS on an unregistered name
  // rather than rendering nothing — the same trap the app's own bootstrap
  // avoids by calling provideIcons(). A TestBed is a bootstrap too.
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideIcons()] }));

  it('round-trips through ngModel in both directions', async () => {
    const fixture = TestBed.createComponent(NgModelHost);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(box(fixture).checked).toBe(false);

    // Control -> model.
    box(fixture).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.model).toBe(true);

    // Model -> control. NgModel defers its write to a microtask, so the DOM
    // is one change-detection pass behind the assignment: stabilise, THEN
    // render, or this reads the pre-write value and passes by accident.
    fixture.componentInstance.model = false;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(box(fixture).checked).toBe(false);
  });

  it('honours a [disabled] input even though the forms module also writes disabled', async () => {
    const fixture = TestBed.createComponent(NgModelHost);
    fixture.detectChanges();
    await fixture.whenStable();

    // ngModel calls setDisabledState(false) on init. If that shared one field
    // with the input, this would already be false and the assertion below
    // would pass for the wrong reason — so flip the input AFTER init.
    fixture.componentInstance.hostDisabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(box(fixture).disabled).toBe(true);
  });

  it('drives a two-way [(checked)] without the forms module', () => {
    const fixture = TestBed.createComponent(ModelHost);
    fixture.detectChanges();

    box(fixture).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(true);

    fixture.componentInstance.value = false;
    fixture.detectChanges();
    expect(box(fixture).checked).toBe(false);
  });

  it('projects rich label content inside its own <label>', () => {
    const fixture = TestBed.createComponent(ModelHost);
    fixture.detectChanges();

    const projected: HTMLElement = fixture.nativeElement.querySelector('.projected');
    expect(projected).withContext('projected content rendered').toBeTruthy();
    // Nested labels break click targeting, so the component must render
    // exactly one and the projected content must sit inside it.
    expect(fixture.nativeElement.querySelectorAll('label').length).toBe(1);
    expect(projected.closest('label')).toBeTruthy();
  });
});
