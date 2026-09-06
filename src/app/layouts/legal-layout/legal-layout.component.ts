import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../design-system/icon/icon.component';

// Shared chrome for legal pages: review banner, back link, title, prose styling.
@Component({
  selector: 'app-legal-layout',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="min-h-screen bg-bg">
      <!-- draft / review banner -->
      <div class="bg-warning-tint-strong px-4 py-2 text-center text-xs font-medium text-warning-ink">
        Draft — pending legal review. Not final; subject to change before launch.
      </div>

      <header class="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <a routerLink="/" class="flex items-center gap-1 font-heading text-xl font-extrabold text-ink coarse:min-h-[44px]">
          <ds-icon name="arrow_back" [size]="18" class="text-brand-ink-soft" />
          Back
        </a>
        <a routerLink="/" class="font-heading text-lg font-bold text-ink coarse:inline-flex coarse:min-h-[44px] coarse:items-center">{{ appName }}</a>
      </header>

      <main id="main" class="mx-auto max-w-3xl px-6 pb-20">
        <h1 class="font-display text-3xl font-semibold text-ink">{{ title }}</h1>
        <p class="mt-1 text-xs text-muted">Last updated: {{ updated }}</p>
        <div class="legal-prose mt-6 text-[15px] leading-relaxed text-content">
          <ng-content></ng-content>
        </div>
      </main>
    </div>
  `,
  // Prose styles for the projected content live in src/styles.scss, not here.
  // <ng-content> nodes carry the parent component's _ngcontent attribute (or,
  // for terms/privacy/disclaimer, none at all), so emulated-encapsulation
  // rules written in this component never matched them.
})
export class LegalLayoutComponent {
  @Input() title = '';
  @Input() updated = '';
  @Input() appName = '';
}
