import { Component, OnDestroy, OnInit } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_URL } from '../../core/config/site';
import { RouterLink } from '@angular/router';
import { SeoPageLayoutComponent } from '../../layouts/seo-page-layout/seo-page-layout.component';

/**
 * The `/ai-doctor` URL is kept as-is on purpose: it is indexed and linked, and
 * changing it would 404 every existing link for no compliance gain. What changed
 * is the *copy* — the page no longer calls DoctoGuide an "AI doctor" anywhere,
 * because that phrasing implies a licensed practitioner and is what Google Ads
 * treats as misrepresentation in a healthcare context. Every self-description on
 * this page is now "AI health assistant", stated as an informational tool.
 */
@Component({
  selector: 'app-ai-doctor-page',
  standalone: true,
  imports: [RouterLink, SeoPageLayoutComponent],
  template: `
    <app-seo-page-layout
      heading="Your free AI health assistant, available 24/7"
      lede="Ask any health question in plain language and get an instant, easy-to-read answer — what could be going on, how urgent it is, and which specialist to see. Free, no sign-up. Informational guidance only, not medical advice."
      ctaTitle="Ask the AI health assistant anything"
      ctaLabel="Start free — no sign-up"
    >
      <h2>What is an AI health assistant?</h2>
      <p>
        An AI health assistant is an artificial-intelligence tool that understands your symptoms
        and health questions the way you naturally describe them — no checkboxes, no medical
        jargon required. DoctoGuide reads your concern, asks sensible follow-up questions, and
        gives you a clear summary of what could be going on and what to do next.
      </p>
      <p>
        <strong>To be clear: an AI health assistant is not a doctor.</strong> DoctoGuide is not a
        licensed medical practitioner and provides educational health information only. It does
        not diagnose, treat, or prescribe. What it does well is help you understand your
        situation, decide how urgent it is, and point you to the right specialist — so when you
        do see a doctor, it's the right one, on the first visit.
      </p>

      <h2>What can you ask?</h2>
      <ul>
        <li>"Is it safe to take antacids on an empty stomach?"</li>
        <li>"Sore throat and mild fever for 3 days — should I be worried?"</li>
        <li>"Which specialist should I see for chest pain?"</li>
        <li>"My child has a rash — what could it be?"</li>
        <li>"What does this value in my blood report mean?"</li>
      </ul>

      <h2>An AI health assistant vs. a doctor — when to use which</h2>
      <p>
        Use DoctoGuide when you're unsure whether something needs a doctor at all, when you don't
        know <a routerLink="/which-specialist-to-see">which specialist to see</a>, or when you want
        to understand a report or medicine before an appointment. See a doctor for anything
        persistent, worsening, or worrying — and for any diagnosis or treatment. For severe
        symptoms like chest pain with breathlessness, sudden weakness, or heavy bleeding, skip
        both and call your local emergency number.
      </p>

      <h2>Why people use an AI health assistant instead of searching online</h2>
      <p>
        A search engine gives you ten pages that range from "it's nothing" to "it's the worst
        case", and you're left to guess. DoctoGuide gives one calm, structured answer based on
        what you actually described — plus a shareable summary you can carry to a real
        consultation. Read more in our <a routerLink="/health-guide">online health guide</a>.
      </p>

      <h2>Frequently asked questions</h2>
      <details>
        <summary>Is the AI health assistant really free?</summary>
        <p>Yes. DoctoGuide is 100% free to start — no sign-up and no credit card needed.</p>
      </details>
      <details>
        <summary>Can it give me a diagnosis or prescription?</summary>
        <p>
          No. DoctoGuide is an information-only assistant and is not a licensed physician. It
          explains what could be going on and which specialist to consult, but diagnosis,
          treatment, and prescriptions always come from a licensed physician.
        </p>
      </details>
      <details>
        <summary>Does it work in my country?</summary>
        <p>
          Yes. DoctoGuide works worldwide and can adapt guidance like emergency
          numbers and nearby-doctor search to your location.
        </p>
      </details>
      <details>
        <summary>Can I chat in Hindi or my own language?</summary>
        <p>
          Yes. Type the way you talk — English, Hindi, Hinglish, or another language — and the
          AI replies in the same language you use.
        </p>
      </details>
      <details>
        <summary>Is my health information private?</summary>
        <p>
          Yes. You can ask questions without creating an account, and we follow a privacy-first
          approach — see our <a routerLink="/privacy">privacy policy</a>.
        </p>
      </details>
    </app-seo-page-layout>
  `,
})
export class AiDoctorPageComponent implements OnInit, OnDestroy {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setJsonLd('page', {
      '@context': 'https://schema.org',
      '@type': 'MedicalWebPage',
      name: 'Free AI Health Assistant Online',
      url: `${SITE_URL}/ai-doctor`,
      inLanguage: 'en',
      about: { '@type': 'MedicalAudience', audienceType: 'Patient' },
    });
    this.seo.setJsonLd('faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is the AI health assistant really free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. DoctoGuide is 100% free to start — no sign-up and no credit card needed.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can DoctoGuide give me a diagnosis or prescription?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. DoctoGuide is an information-only assistant and is not a licensed physician. It explains what could be going on and which specialist to consult, but diagnosis, treatment, and prescriptions always come from a licensed physician.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does the AI health assistant work in my country?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. DoctoGuide works worldwide and can adapt guidance like emergency numbers and nearby-doctor search to your location.',
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
          name: 'Is my health information private?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. You can ask questions without creating an account, and DoctoGuide follows a privacy-first approach.',
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
