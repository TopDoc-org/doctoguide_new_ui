import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/**
 * A user avatar with an initials fallback.
 *
 * The fallback is the normal case, not the error case: this app has no avatar
 * upload, so `src` is empty for every user today and initials are what
 * everyone sees. The image path exists so adding uploads later is a binding,
 * not a redesign.
 *
 * Colour is derived from the name rather than random or fixed, so the same
 * person is the same colour on every screen — which is the only thing that
 * makes a coloured avatar more useful than a grey one.
 */
@Component({
  selector: 'ds-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src() && !failed()) {
      <img
        [src]="src()"
        [alt]="name()"
        [class]="classes()"
        (error)="failed.set(true)" />
    } @else {
      <!-- aria-hidden + the name in an sr-only sibling would double up wherever
           the avatar sits next to the name, which is everywhere it is used. So:
           the initials are decorative and the surrounding UI carries the name. -->
      <span [class]="classes()" [style.background-color]="tint()" aria-hidden="true">
        {{ initials() }}
      </span>
    }
  `,
  styles: [`:host { display: inline-block; }`],
})
export class AvatarComponent {
  readonly name = input('');
  readonly src = input('');
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly failed = signal(false);

  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    // First and last, not first two: "Dr Anita Rao" should read AR, not DA.
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  });

  /**
   * A stable hue from the name. `hsl` with fixed saturation and lightness keeps
   * every avatar at the same contrast against white text — picking from a list
   * of brand colours instead would put teal-100 and teal-800 side by side and
   * make half of them illegible.
   */
  protected readonly tint = computed(() => {
    const name = this.name();
    if (!name) return 'rgb(var(--text-muted))';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    return `hsl(${Math.abs(hash) % 360} 45% 42%)`;
  });

  protected readonly classes = computed(() => {
    const base =
      'grid place-items-center shrink-0 rounded-full object-cover ' +
      'font-heading font-semibold text-white select-none';
    const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' };
    return `${base} ${sizes[this.size()]}`;
  });
}
