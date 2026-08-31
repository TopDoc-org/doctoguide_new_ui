import { Component, OnDestroy, OnInit } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_URL } from '../../core/config/site';
import { RouterLink } from '@angular/router';
import { SeoPageLayoutComponent } from '../../layouts/seo-page-layout/seo-page-layout.component';

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [RouterLink, SeoPageLayoutComponent],
  template: `
    <app-seo-page-layout
      heading="DoctoGuide pricing: free, always"
      lede="No subscription, no per-consultation fee, no locked features behind a paywall. Every part of DoctoGuide — symptom checker, AI health assistant, specialist matching, doctor search — is free to use."
      ctaTitle="Try DoctoGuide — free, no card needed"
      ctaLabel="Get started for free"
    >
      <h2>What's included, at no cost</h2>
      <ul>
        <li>Unlimited use of the <a routerLink="/symptom-checker">AI symptom checker</a>.</li>
        <li>Unlimited conversations with the <a routerLink="/ai-doctor">AI health assistant</a>.</li>
        <li>Specialist matching — see <a routerLink="/which-specialist-to-see">which specialist to see</a>.</li>
        <li><a routerLink="/find-doctors">Finding doctors near you</a>, matched to your symptoms.</li>
        <li>The full <a routerLink="/health-guide">online health guide</a> — symptoms, reports, and medicines explained.</li>
        <li>No sign-up, no credit card, no trial period that expires.</li>
      </ul>

      <h2>How can it be free?</h2>
      <p>
        DoctoGuide is built by KnocDoc as a free, public health-information tool for India — the
        aim is to get more people to the right care faster, in a country where a wrong or delayed
        first consultation is common and costly. There's no ad-supported paywall trick and no
        "free tier" that limits how many times you can describe your symptoms.
      </p>

      <h2>Is there a paid or premium version?</h2>
      <p>
        No. There is currently no paid tier, subscription, or premium plan for DoctoGuide. If that
        ever changes, the free symptom checker, AI health assistant conversations, and specialist guidance
        described on this page will remain free.
      </p>

      <h2>What DoctoGuide doesn't charge for — or provide</h2>
      <p>
        DoctoGuide doesn't charge you anything, and it also doesn't replace a paid consultation
        with a licensed physician — it's a free first step that gets you to the right doctor
        faster, not a substitute for one. In an emergency, don't look for pricing — call your
        local emergency number. See <a routerLink="/emergency-numbers">emergency numbers by country</a>.
      </p>

      <h2>Frequently asked questions</h2>
      <details>
        <summary>Do I need a credit card to use DoctoGuide?</summary>
        <p>No. Nothing to enter, nothing to cancel later.</p>
      </details>
      <details>
        <summary>Is there a limit on how many times I can use it?</summary>
        <p>No usage cap — describe as many symptoms, for yourself or family members, as you need.</p>
      </details>
      <details>
        <summary>Will DoctoGuide always be free?</summary>
        <p>The core symptom checker, AI health assistant, and specialist guidance on this page are free today and intended to stay that way.</p>
      </details>
    </app-seo-page-layout>
  `,
})
export class PricingPageComponent implements OnInit, OnDestroy {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setJsonLd('page', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'DoctoGuide Pricing',
      url: `${SITE_URL}/pricing`,
      inLanguage: 'en',
    });
    this.seo.setJsonLd('faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Do I need a credit card to use DoctoGuide?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. Nothing to enter, nothing to cancel later.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is there a limit on how many times I can use it?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No usage cap — describe as many symptoms, for yourself or family members, as you need.',
          },
        },
        {
          '@type': 'Question',
          name: 'Will DoctoGuide always be free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The core symptom checker, AI health assistant, and specialist guidance are free today and intended to stay that way.',
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
