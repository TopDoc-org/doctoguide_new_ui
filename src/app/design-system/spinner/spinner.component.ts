import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ds-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-block rounded-full border-2 border-current border-r-transparent animate-spin"
      [style.width.px]="size()" [style.height.px]="size()"
      role="status" aria-label="Loading"></span>
  `,
})
export class SpinnerComponent {
  size = input(20);
}
