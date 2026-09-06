import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CountryService } from '../../core/country/country.service';
import { AiDoctorStateService } from '../../features/triage/services/ai-doctor-state.service';
import { SeoService } from '../../core/seo/seo.service';
import { FirebaseAnalyticsService } from '../../core/analytics/firebase-analytics.service';
import { RouterLink } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../design-system/icon/icon.component';
import { TypewriterComponent } from '../../design-system/typewriter/typewriter.component';
import { SheetComponent } from '../../design-system/sheet/sheet.component';
import { PopoverDirective } from '../../design-system/popover/popover.directive';
import { DropdownMenuComponent } from '../../design-system/dropdown-menu/dropdown-menu.component';
import { AvatarComponent } from '../../design-system/avatar/avatar.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    IconComponent,
    TypewriterComponent,
    SheetComponent,
    PopoverDirective,
    DropdownMenuComponent,
    AvatarComponent,
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements OnInit, OnDestroy {
  appName = environment.appName;
  query = '';
  placeholder = '';
  countryName: string | null = null;
  instagramUrl = environment.instagram.url;
  instagramHandle = environment.instagram.handle;

  /**
   * The hero line, typed one phrase at a time.
   *
   * Written as problems, not features: a visitor arrives holding a lab report
   * they cannot read or a symptom they are worried about, and recognises their
   * own situation faster than a feature name. Order is deliberate — the two
   * things nothing else free does (reading a report, reading handwriting) come
   * first, and the phrase a crawler and a no-JS visitor see is phrase one.
   */
  heroPhrases = [
    'Understand your lab report, in plain words.',
    "Read your doctor's handwriting for you.",
    'Know which medicine to take when — before or after food.',
    'Describe a symptom, in any language.',
    'Find out which specialist you actually need.',
    'Carry a clear summary to your next visit.',
  ];

  // Example queries typed into the input placeholder, one after another.
  useCases = [
    'Is it safe to take antacids on an empty stomach?',
    'Sore throat and mild fever for 3 days…',
    'mere pet me dard hai aur ulti ho rahi hai…',
    'Which specialist should I see for chest pain?',
    'मुझे तीन दिन से बुखार है…',
    'My child has a rash — what could it be?',
    'Persistent headache for a week — should I worry?',
  ];

  private phIndex = 0;
  private phTimer: any = null;

  // Claims must be substantiable (Consumer Protection / CCPA / ASCI). "Anonymous"
  // and "verified" were inaccurate once accounts/PII exist and doctors are an
  // unvetted maps directory.
  trustChips = [
    { icon: 'money_off', label: 'Free — no card, no sign-up' },
    { icon: 'translate', label: 'Ask in any language' },
    { icon: 'medical_services', label: 'Suggests the right specialist' },
    { icon: 'lock', label: 'Privacy-first' },
    { icon: 'shield', label: 'Private & secure' },
    { icon: 'info', label: 'Information-only, not a prescription' },
    { icon: 'menu_book', label: 'Educational information' },
  ];

  // Static-friendly: this exact value lands in the prerendered HTML, so it must
  // read sensibly without JS (it swaps to "You are in X" after detection).
  readonly isBrowser: boolean;

  // Browser-only (state reads localStorage, unavailable during prerender). The
  // prerendered HTML always shows Log in / Sign up; this swaps them out after
  // hydration for users who already have a session.
  isLoggedIn = false;
  menuOpen = false;
  mobileNavOpen = false;

  constructor(
    private router: Router,
    private country: CountryService,
    private state: AiDoctorStateService,
    private seo: SeoService,
    private analytics: FirebaseAnalyticsService,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // Which placement earned the follow — the header icon or the footer handle.
  trackInstagramFollow(source: 'nav' | 'footer'): void {
    this.analytics.logAnalyticsEvent('instagram_follow_click', { source });
  }

  // Label for the location banner. Avoids an escaped apostrophe in the template.
  get locationLabel(): string {
    return this.countryName ? `You are in ${this.countryName}` : 'Available worldwide';
  }

  // Emergency copy comes from CountryService, never from raw numbers stitched
  // into the template: it deduplicates countries where the all-emergencies and
  // ambulance numbers are the same (which used to render "call 911 or 911"),
  // and falls back to neutral "your local emergency services (112 / 911)" text
  // while the country is unknown — including in the prerendered HTML.
  get emergencySentence(): string {
    return this.country.emergencySentence;
  }
  get emergencyNumbersText(): string {
    return this.country.emergencyNumbersText;
  }

  // Country-aware copy with neutral fallbacks when the country is unknown.
  // e.g. "India's" / "Your", and "built for India" / "built for you".
  get countryPossessive(): string {
    return this.countryName ? `${this.countryName}'s` : 'Your';
  }
  get countryForCopy(): string {
    return this.countryName || 'you';
  }
  // " in India" / " in the United States" when known, "" otherwise — used
  // inline mid-sentence. Delegated so the definite-article handling lives in
  // one place.
  get inCountry(): string {
    return this.country.inCountry;
  }

  ngOnInit(): void {
    // FAQPage schema for the homepage only (mirrors the visible FAQ below).
    // Kept country-neutral so the prerendered markup is valid worldwide.
    this.seo.setJsonLd('faq', this.faqSchema());

    if (this.isBrowser) {
      this.isLoggedIn = this.state.isLoggedIn;
      // Typewriter is a self-rescheduling macrotask loop — it would keep the app
      // from ever becoming stable during prerender, so it is browser-only.
      this.typePlaceholder();
    } else {
      this.placeholder = this.useCases[0];
    }
    // Resolve country context (IP-based, cached) for the location banner.
    this.country.init().then(() => {
      this.countryName = this.country.countryName;
    });
  }

  ngOnDestroy(): void {
    if (this.phTimer) clearTimeout(this.phTimer);
    this.seo.removeJsonLd('faq');
  }

  private faqSchema(): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is DoctoGuide free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. DoctoGuide by KnocDoc is 100% free to start. There is no sign-up and no credit card needed to describe your symptoms and get AI health guidance.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is DoctoGuide medical advice?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'DoctoGuide is an AI health-information assistant, not a licensed physician. It gives educational information and suggests which specialist to see, but it does not provide a diagnosis, treatment, or prescription. In an emergency, call your local emergency number (for example 911, 112, or 999).',
          },
        },
        {
          '@type': 'Question',
          name: 'Which specialist should I see for my symptoms?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Describe what you are feeling in plain language and DoctoGuide reads your concern and points you to the right speciality, then helps you find doctors near you.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need to sign up to use the AI symptom checker?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. You can use the AI symptom checker instantly with no sign-up. You only create an account if you want to save your health summary or past consultations.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I chat in Hindi or my own language?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Type the way you talk — English, Hindi, Hinglish, or another language — and the AI replies in the same language you use.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can DoctoGuide help me find a doctor near me?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. After reviewing your symptoms, DoctoGuide can help you find licensed doctors near you by city or location, with ratings, hours, and contact details.',
          },
        },
      ],
    };
  }

  // Typewriter for the input placeholder: type a use-case, pause, erase, next.
  private typePlaceholder(): void {
    const full = this.useCases[this.phIndex] || '';
    if (this.placeholder.length < full.length) {
      this.placeholder = full.slice(0, this.placeholder.length + 1);
      this.phTimer = setTimeout(() => this.typePlaceholder(), 55);
      return;
    }
    this.phTimer = setTimeout(() => this.erasePlaceholder(), 1800);
  }

  private erasePlaceholder(): void {
    if (this.placeholder.length > 0) {
      this.placeholder = this.placeholder.slice(0, -1);
      this.phTimer = setTimeout(() => this.erasePlaceholder(), 30);
      return;
    }
    this.phIndex = (this.phIndex + 1) % this.useCases.length;
    this.phTimer = setTimeout(() => this.typePlaceholder(), 250);
  }

  /**
   * Footer contact. Assembled at click time rather than bound in the template, so
   * the number never appears in the prerendered HTML for scrapers to harvest.
   */
  openWhatsApp(): void {
    if (!this.isBrowser) return;
    const { cc, subscriber, text } = environment.whatsapp;
    window.open(
      `https://api.whatsapp.com/send/?phone=${cc}${subscriber}&text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener',
    );
  }

  start() {
    const q = (this.query || '').trim();
    this.router.navigate(['/triage'], {
      queryParams: q ? { q } : {},
    });
  }

  // Log in / Sign up both open the PIN auth gate inside the triage shell.
  login() {
    this.router.navigate(['/triage'], { queryParams: { login: 1 } });
  }

  // --- Logged-in avatar menu (mirrors the triage-shell side drawer) ---
  get userName(): string | null {
    return this.isBrowser ? this.state.userName : null;
  }
  get userMobile(): string | null {
    return this.isBrowser ? this.state.userMobile : null;
  }
  goProfile() {
    this.menuOpen = false;
    this.router.navigate(['/triage/profile']);
  }

  goChangePin() {
    this.menuOpen = false;
    this.router.navigate(['/triage/change-pin']);
  }

  // ?login=1 + logged in => triage shell opens the consult-history panel.
  goConsults() {
    this.menuOpen = false;
    this.login();
  }

  logout() {
    this.menuOpen = false;
    this.state.logout();
    this.isLoggedIn = false;
  }
}
