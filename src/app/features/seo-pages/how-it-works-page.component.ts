import { Component, OnDestroy, OnInit } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_URL } from '../../core/config/site';
import { RouterLink } from '@angular/router';
import { SeoPageLayoutComponent } from '../../layouts/seo-page-layout/seo-page-layout.component';

@Component({
  selector: 'app-how-it-works-page',
  standalone: true,
  imports: [RouterLink, SeoPageLayoutComponent],
  template: `
    <app-seo-page-layout
      heading="How DoctoGuide works"
      lede="From symptoms to a clear next step in three short steps — free, no sign-up, no app to install. Here's exactly what happens when you use DoctoGuide."
      ctaTitle="See it work on your own symptoms"
      ctaLabel="Try DoctoGuide now"
    >
      <h2>Step 1 — Describe what you're feeling</h2>
      <p>
        Open DoctoGuide and describe your symptoms in your own words — in English or Hindi/Hinglish.
        There's no rigid checklist to fill in. "Fever and body ache since yesterday, worse at night"
        is enough for the AI to start working with.
      </p>

      <h2>Step 2 — Answer a few targeted follow-up questions</h2>
      <p>
        DoctoGuide's AI asks only what's relevant to your specific symptoms — duration, severity,
        what makes it better or worse, any related history. This is the same information a doctor
        would ask in the first minute of a consultation, gathered before you ever see one.
      </p>

      <h2>Step 3 — Get guidance, urgency, and next steps</h2>
      <ul>
        <li>A plain-language explanation of what could be causing your symptoms.</li>
        <li>An urgency read: safe to manage at home, see a doctor soon, or seek urgent care now.</li>
        <li>Which type of specialist fits your case — see <a routerLink="/which-specialist-to-see">which specialist to see</a>.</li>
        <li>Doctors near you, when you're ready to book an actual consultation.</li>
        <li>A clear summary you can share with the doctor you eventually see, so you don't repeat yourself.</li>
      </ul>

      <h2>What makes it different from searching symptoms online</h2>
      <p>
        A search engine returns articles written for the general population; DoctoGuide reads
        <em>your</em> specific description and responds to it directly. It doesn't stop at
        information — it tells you what to do next: monitor, book a specialist, or treat it as an
        emergency. See the full <a routerLink="/ai-doctor">AI health assistant</a> and
        <a routerLink="/symptom-checker">symptom checker</a> pages for more on each part.
      </p>

      <h2>What DoctoGuide doesn't do</h2>
      <p>
        It doesn't diagnose, prescribe, or replace a licensed physician — it's an information and
        triage layer that gets you to the right care faster. For chest pain, breathing trouble,
        sudden weakness, heavy bleeding, or any other emergency, skip the app and call your local
        emergency number — see <a routerLink="/emergency-numbers">emergency numbers by country</a>.
      </p>

      <h2>Frequently asked questions</h2>
      <details>
        <summary>How long does it take?</summary>
        <p>Most people get a full readout — cause, urgency, specialist, and next step — in under two minutes.</p>
      </details>
      <details>
        <summary>Do I need to create an account?</summary>
        <p>No. DoctoGuide is free to use with no sign-up and no credit card required.</p>
      </details>
      <details>
        <summary>Does it work in Hindi?</summary>
        <p>Yes — describe your symptoms in Hindi, Hinglish, or English and DoctoGuide responds in kind.</p>
      </details>
    </app-seo-page-layout>
  `,
})
export class HowItWorksPageComponent implements OnInit, OnDestroy {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setJsonLd('page', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'How DoctoGuide Works',
      url: `${SITE_URL}/how-it-works`,
      inLanguage: 'en',
    });
    this.seo.setJsonLd('faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How long does it take?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Most people get a full readout — cause, urgency, specialist, and next step — in under two minutes.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need to create an account?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. DoctoGuide is free to use with no sign-up and no credit card required.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does it work in Hindi?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes — describe your symptoms in Hindi, Hinglish, or English and DoctoGuide responds in kind.',
          },
        },
      ],
    });
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('page');
    this.seo.removeJsonLd('faq');
  }
}
