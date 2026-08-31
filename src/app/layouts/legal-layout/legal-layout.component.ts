import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../design-system/icon/icon.component';

// Shared chrome for legal pages: review banner, back link, title, prose styling.
@Component({
  selector: 'app-legal-layout',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="min-h-screen bg-cream">
      <!-- draft / review banner -->
      <div class="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
        Draft — pending legal review. Not final; subject to change before launch.
      </div>

      <header class="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <a routerLink="/" class="flex items-center gap-1 font-heading text-xl font-extrabold text-teal-900">
          <ds-icon name="arrow_back" [size]="18" class="text-teal-600" />
          Back
        </a>
        <a routerLink="/" class="font-heading text-lg font-bold text-teal-900">{{ appName }}</a>
      </header>

      <main class="mx-auto max-w-3xl px-6 pb-20">
        <h1 class="font-display text-3xl font-semibold text-teal-900">{{ title }}</h1>
        <p class="mt-1 text-xs text-teal-900/50">Last updated: {{ updated }}</p>
        <div class="legal-prose mt-6 text-[15px] leading-relaxed text-teal-900/80">
          <ng-content></ng-content>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .legal-prose h2 {
        font-weight: 700;
        font-size: 1.05rem;
        color: #134e4a;
        margin-top: 1.6rem;
        margin-bottom: 0.4rem;
      }
      .legal-prose h3 {
        font-weight: 600;
        color: #134e4a;
        margin-top: 1rem;
        margin-bottom: 0.25rem;
      }
      .legal-prose p { margin-bottom: 0.75rem; }
      .legal-prose ul {
        list-style: disc;
        padding-left: 1.25rem;
        margin-bottom: 0.75rem;
      }
      .legal-prose li { margin-bottom: 0.35rem; }
      .legal-prose a { color: #0d9488; text-decoration: underline; }
      .legal-prose strong { color: #134e4a; }
    `,
  ],
})
export class LegalLayoutComponent {
  @Input() title = '';
  @Input() updated = '';
  @Input() appName = '';
}
