import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Loading placeholder. Honours prefers-reduced-motion (the global rule in
 *  styles.scss already neutralises the sweep, this keeps the box legible). */
@Component({
  selector: 'ds-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="sk block relative overflow-hidden rounded-md bg-surface-2"
          [style.width]="width()" [style.height]="height()"
          [class.rounded-full]="circle()"
          aria-hidden="true"></span>
  `,
  styles: [`
    :host { display: block; }
    .sk::after {
      content: '';
      position: absolute;
      inset: 0;
      transform: translateX(-100%);
      background: linear-gradient(90deg, transparent, rgb(var(--surface) / .55), transparent);
      animation: sk-sweep 1.6s infinite;
    }
    @keyframes sk-sweep { 100% { transform: translateX(100%); } }
    @media (prefers-reduced-motion: reduce) { .sk::after { animation: none; } }
  `],
})
export class SkeletonComponent {
  width = input('100%');
  height = input('16px');
  circle = input(false);
}
