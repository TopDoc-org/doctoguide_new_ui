import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SwitchComponent } from './switch.component';

/**
 * See `checkbox.component.spec.ts` for why these two controls are the ones
 * with specs. `ds-switch` carries the partner console's offer rows, where a
 * flip PERSISTS — a control that shows a state the server never accepted is
 * the failure worth a test.
 */
@Component({
  standalone: true,
  imports: [SwitchComponent],
  template: `
    <ds-switch [checked]="enabled" (checkedChange)="onChange($event)" [disabled]="busy">
      <span class="projected">Free first consult</span>
    </ds-switch>
  `,
})
class Host {
  enabled = false;
  busy = false;
  received: boolean[] = [];
  onChange(v: boolean): void {
    this.received.push(v);
  }
}

function input(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('input[type="checkbox"]');
}

describe('ds-switch', () => {
  it('emits the new value on flip, and follows the caller when it changes', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    input(fixture).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.received).toEqual([true]);

    // The caller accepts the flip and writes it through.
    fixture.componentInstance.enabled = true;
    fixture.detectChanges();
    expect(input(fixture).checked).toBe(true);

    // …and turns it off later from somewhere else — a reload, another row.
    fixture.componentInstance.enabled = false;
    fixture.detectChanges();
    expect(input(fixture).checked).toBe(false);
  });

  it('does NOT re-sync when the caller writes back the value it already had', () => {
    // This is a statement of a limit, not a wish. Angular writes an input only
    // when its value CHANGED, so a failed save that leaves the source boolean
    // untouched cannot move the control back on its own — the switch keeps the
    // position the user clicked it into and misreports what was saved.
    //
    // It is fixed at the CALL SITE, not here: partner-campaigns replaces the
    // row object and partner-dashboard refetches, either of which remounts the
    // row. Anything new binding [checked] to a value that a failure leaves
    // unchanged has to do one of those two things.
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    input(fixture).click();
    fixture.detectChanges();

    fixture.componentInstance.enabled = false; // unchanged from its initial value
    fixture.detectChanges();

    expect(input(fixture).checked).toBe(true);
  });

  it('is a real checkbox with role="switch", not a div', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(input(fixture).getAttribute('role')).toBe('switch');
  });

  it('disables from the input alone, with no forms module involved', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.busy = true;
    fixture.detectChanges();
    expect(input(fixture).disabled).toBe(true);
  });

  it('projects rich content into the single <label> it renders', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const projected: HTMLElement = fixture.nativeElement.querySelector('.projected');
    expect(projected).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('label').length).toBe(1);
    expect(projected.closest('label')).toBeTruthy();
  });
});
