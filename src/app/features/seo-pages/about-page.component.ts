import { Component, OnDestroy, OnInit } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_URL } from '../../core/config/site';
import { LEGAL_CONFIG } from '../legal/legal-config';
import { RouterLink } from '@angular/router';

import { SeoPageLayoutComponent } from '../../layouts/seo-page-layout/seo-page-layout.component';

/**
 * About page — the primary entity/trust page. Its job is to make the
 * "DoctoGuide -> product -> operated by KnocDoc" relationship explicit in
 * crawlable HTML, which is what search engines need to resolve the brand.
 *
 * Every claim here is drawn from the repository or from KnocDoc's own public
 * sites. No credentials, advisors, certifications, partnerships, or regulatory
 * approvals are asserted, because none are documented in this project.
 */
@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [RouterLink, SeoPageLayoutComponent],
  template: `
    <app-seo-page-layout
      heading="About DoctoGuide"
      lede="DoctoGuide is a free AI health assistant and symptom checker built by KnocDoc. It helps you understand what you're feeling, how urgent it might be, and which kind of doctor to see next."
      ctaTitle="See what DoctoGuide makes of your symptoms"
      ctaLabel="Try it free"
      >
      <h2>What DoctoGuide is</h2>
      <p>
        DoctoGuide is an AI health-information assistant. You describe how you feel in your own
        words — English, हिन्दी, Hinglish, or another language — and it asks the kind of follow-up
        questions a clinician would ask before pointing you toward the right next step.
      </p>
      <p>
        What you get back is a plain-language explanation of what might be going on, a sense of how
        urgent it is, the medical speciality best suited to it, and a summary you can carry into an
        actual consultation. It is free, needs no account, and asks for no card.
      </p>

      <h2>Who builds it</h2>
      <p>
        DoctoGuide is built and operated by <strong>KnocDoc</strong>, a health-technology company
        whose main product reduces the time patients spend waiting for medical consultations
        through real-time queue updates. You can read more at
        <a href="https://knocdoc.in/" rel="noopener">knocdoc.in</a>.
      </p>
      <p>
        DoctoGuide is one of several products KnocDoc operates, alongside
        <a href="https://doctribe.knocdoc.in/" rel="noopener">DocTribe</a>, a professional network
        built for doctors. The consistent name for this product across everything KnocDoc publishes
        is <strong>DoctoGuide by KnocDoc</strong>.
      </p>

      @if (entityKnown) {
        <h2>Operating entity</h2>
      }
      @if (entityKnown) {
        <p>
          DoctoGuide is operated by {{ legal.entityName }}, {{ legal.entityAddress }}.
        </p>
      }

      <h2>Why it exists</h2>
      <p>
        Most people start a health worry with a search engine, and search engines are bad at it.
        You get a wall of worst-case results with no sense of which apply to you, no follow-up
        questions, and no answer to the practical question underneath: <em>who do I actually go
      see?</em> In India specifically, picking the wrong speciality for a first consultation
      costs time and money that many people can't spare.
    </p>
    <p>
      DoctoGuide is built to answer that practical question well, and to hand you something
      useful to bring to a real doctor — not to be the doctor.
    </p>

    <h2>What DoctoGuide will not do</h2>
    <p>
      DoctoGuide does not diagnose you. It does not prescribe or recommend medication, adjust an
      existing prescription, or provide treatment. It is not a licensed physician and does not
      replace one. Its output is health information to help you make a better-informed decision
      about seeking care.
    </p>
    <p>
      The full picture of what the AI can and cannot do — including how it can be wrong and what
      to do about that — is on the <a routerLink="/medical-safety">medical safety page</a>.
    </p>

    <h2>How your information is handled</h2>
    <p>
      You can use the symptom checker without creating an account. What you share is used to
      produce your guidance and summary. The
      <a routerLink="/privacy">privacy policy</a> covers collection, use, and retention in full,
      and the <a routerLink="/terms">terms of use</a> cover the rest.
    </p>

    <h2>Getting in touch</h2>
    <p>
      Ways to reach the team are on the <a routerLink="/contact">contact page</a>.
    </p>
    </app-seo-page-layout>
    `,
})
export class AboutPageComponent implements OnInit, OnDestroy {
  legal = LEGAL_CONFIG;

  // The legal entity fields ship as "[... — to be confirmed]" placeholders until a
  // qualified person fills them in. Never render a placeholder as if it were a fact.
  get entityKnown(): boolean {
    return !this.legal.entityName.startsWith('[');
  }

  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'About', item: `${SITE_URL}/about` },
      ],
    });
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('breadcrumb');
  }
}
