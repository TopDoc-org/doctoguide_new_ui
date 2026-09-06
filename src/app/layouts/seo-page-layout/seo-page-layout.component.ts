import { Component, Input } from '@angular/core';
import { environment } from '../../../environments/environment';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../design-system/icon/icon.component';

// Shared chrome for the public SEO/content pages: header, hero (H1 + lede),
// prose content slot, CTA into /triage, cross-links, and the legal footer.
// These pages are prerendered, so everything here must render without JS.
@Component({
  selector: 'app-seo-page-layout',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="min-h-screen bg-bg">
      <header class="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <a routerLink="/" class="flex items-center gap-1 font-heading text-xl font-extrabold text-ink coarse:min-h-[44px]">
          <span class="truncate">{{ appName }}</span>
          <ds-icon name="auto_awesome" [size]="18" class="shrink-0 text-teal-500" />
        </a>
        <a
          routerLink="/triage"
          class="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-surface hover:bg-brand-ink coarse:min-h-[44px] coarse:inline-flex coarse:items-center"
        >Get started</a>
      </header>

      <main id="main" class="mx-auto max-w-3xl px-6 pb-20">
        <h1 class="font-display text-3xl leading-tight text-ink sm:text-4xl">{{ heading }}</h1>
        <p class="mt-3 text-[15px] leading-relaxed text-content">{{ lede }}</p>

        <div class="seo-prose mt-8 text-[15px] leading-relaxed text-content">
          <ng-content></ng-content>
        </div>

        <!-- CTA -->
        <div class="mt-12 rounded-2xl border border-brand-line bg-brand-tint/80 p-6 text-center">
          <p class="font-heading text-lg font-bold text-ink">{{ ctaTitle }}</p>
          <p class="mt-1 text-sm text-content">Free. No sign-up, no credit card. Ready in seconds.</p>
          <a
            routerLink="/triage"
            class="mt-4 inline-flex items-center gap-1 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700"
            >
            {{ ctaLabel }}
            <ds-icon name="arrow_forward" [size]="18" />
          </a>
        </div>

        <!-- cross-links -->
        <nav class="mt-12 border-t border-line/10 pt-6">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Explore DoctoGuide</p>
          <ul class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            @for (l of links; track l) {
              <li>
                <a [routerLink]="l.path" class="text-brand-ink underline hover:text-ink">{{ l.label }}</a>
              </li>
            }
          </ul>
        </nav>

        <p class="mt-10 text-xs text-muted">
          {{ appName }} is an AI health-information assistant, not a licensed physician. It does not
          provide medical advice, diagnosis, treatment, or prescriptions. In an emergency, call your
          local emergency number.
        </p>

        <footer class="mt-6 border-t border-line/10 pt-4 text-center text-xs text-muted">
          <a routerLink="/privacy" class="coarse:inline-flex coarse:min-h-[44px] coarse:items-center hover:text-brand-ink">Privacy Policy</a>
          <span class="mx-2">·</span>
          <a routerLink="/terms" class="coarse:inline-flex coarse:min-h-[44px] coarse:items-center hover:text-brand-ink">Terms of Use</a>
          <span class="mx-2">·</span>
          <a routerLink="/disclaimer" class="coarse:inline-flex coarse:min-h-[44px] coarse:items-center hover:text-brand-ink">Medical Disclaimer</a>
          <span class="mx-2">·</span>
          <a routerLink="/contact" class="coarse:inline-flex coarse:min-h-[44px] coarse:items-center hover:text-brand-ink">Contact</a>

          <!-- Who operates the site and how to reach them, on every public page. -->
          <p class="mt-3 leading-relaxed">
            {{ appName }} is operated by
            <strong class="font-semibold text-content">KnocDoc</strong>. Support:
            <a href="mailto:support@knocdoc.in" class="underline hover:text-brand-ink">support&#64;knocdoc.in</a>
            ·
            <a href="https://knocdoc.in/" target="_blank" rel="noopener" class="underline hover:text-brand-ink">knocdoc.in</a>
          </p>
        </footer>
      </main>
    </div>
    `,
  // Prose styles for the projected content live in src/styles.scss, not here.
  // <ng-content> nodes carry the parent component's _ngcontent attribute, so
  // emulated-encapsulation rules written in this component never match them.
})
export class SeoPageLayoutComponent {
  appName = environment.appName;
  @Input() heading = '';
  @Input() lede = '';
  @Input() ctaTitle = 'Try DoctoGuide now';
  @Input() ctaLabel = 'Get started';

  // Cross-links between the public SEO pages (crawl path + UX).
  links = [
    { path: '/', label: 'Home' },
    { path: '/ai-doctor', label: 'AI Health Assistant' },
    { path: '/symptom-checker', label: 'Symptom Checker' },
    { path: '/which-specialist-to-see', label: 'Which Specialist to See' },
    { path: '/health-topics', label: 'Health Topics' },
    { path: '/find-doctors', label: 'Find a Doctor Near You' },
    { path: '/health-guide', label: 'Online Health Guide' },
    { path: '/how-it-works', label: 'How It Works' },
    { path: '/medical-safety', label: 'Medical Safety' },
    { path: '/about', label: 'About DoctoGuide' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/emergency-numbers', label: 'Emergency Numbers by Country' },
    { path: '/contact', label: 'Contact' },
  ];
}
