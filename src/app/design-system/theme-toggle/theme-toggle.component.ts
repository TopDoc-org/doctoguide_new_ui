import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ThemeService } from '../../core/theme/theme.service';
import { IconComponent } from '../icon/icon.component';

/**
 * The light/dark switch. Wired to the existing `ThemeService`, which has had
 * the plumbing (signal, storage key, `data-theme` attribute, `theme-color` meta)
 * since the migration but no UI — see that service's header for why it was
 * deliberately left unreachable, and `MIGRATION-NOTES` "Redesign" for the
 * decision to expose it.
 *
 * An icon BUTTON, not a `ds-switch`. A switch reads as "on or off", and neither
 * light nor dark is the off state; the button shows the theme you would get by
 * pressing it, which is the only labelling of this control anyone reads.
 */
@Component({
  selector: 'ds-theme-toggle',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      (click)="theme.toggle()"
      [attr.aria-label]="label()"
      [attr.title]="label()"
      [class]="classes()">
      <!-- Both icons are rendered and cross-faded rather than swapped, so the
           button never reflows mid-press and the transition can be a plain
           opacity animation on the compositor. -->
      <span class="relative grid place-items-center w-5 h-5">
        <ds-icon
          name="sun"
          [size]="20"
          class="absolute transition-opacity duration-base"
          [class.opacity-0]="!isLight()" />
        <ds-icon
          name="moon"
          [size]="20"
          class="absolute transition-opacity duration-base"
          [class.opacity-0]="isLight()" />
      </span>
    </button>
  `,
  styles: [`:host { display: inline-block; }`],
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);

  /** `glass` for use on a glass app bar, where a solid surface would sit oddly. */
  readonly variant = input<'ghost' | 'glass'>('ghost');

  protected readonly isLight = computed(() => this.theme.theme() === 'light');
  protected readonly label = computed(() =>
    this.isLight() ? 'Switch to dark theme' : 'Switch to light theme',
  );

  protected readonly classes = computed(() => {
    const base =
      'grid place-items-center w-11 h-11 rounded-lg text-muted ' +
      'transition-colors duration-fast ease-standard ' +
      'hover:text-content focus-visible:focus-ring';
    return this.variant() === 'glass'
      ? `${base} hover:bg-surface/10`
      : `${base} hover:bg-surface-2/70`;
  });
}
