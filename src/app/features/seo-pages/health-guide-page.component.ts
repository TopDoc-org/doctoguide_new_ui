import { Component, OnDestroy, OnInit } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_URL } from '../../core/config/site';
import { RouterLink } from '@angular/router';
import { SeoPageLayoutComponent } from '../../layouts/seo-page-layout/seo-page-layout.component';

@Component({
  selector: 'app-health-guide-page',
  standalone: true,
  imports: [RouterLink, SeoPageLayoutComponent],
  template: `
    <app-seo-page-layout
      heading="Your online health guide, in plain language"
      lede="Lab reports full of jargon, medicines with confusing names, symptoms you're not sure about — ask DoctoGuide and get clear, calm answers you can actually use."
      ctaTitle="Ask your health question now"
      ctaLabel="Get answers — free"
    >
      <h2>Decode your lab reports and medical jargon</h2>
      <p>
        "TSH slightly elevated." "Borderline LDL." What does that actually mean for you? Paste the
        confusing part of your report or prescription into DoctoGuide and get a plain-language
        explanation — what the value measures, what "high" or "low" tends to mean, and what's
        worth asking your doctor about.
      </p>

      <h2>Understand your medicines</h2>
      <p>
        Ask what a medicine is for, how it's commonly taken, and what to watch out for — in
        everyday words. DoctoGuide explains; your doctor and pharmacist decide. Never start or
        stop a prescription medicine without consulting them.
      </p>

      <h2>When home care is enough — and when it isn't</h2>
      <p>
        Plenty of everyday issues — a mild cold, occasional acidity, a small bruise — can be
        managed at home, and knowing that saves you an unnecessary visit. The
        <a routerLink="/symptom-checker">AI symptom checker</a> tells you when home care is
        reasonable, what warning signs to watch for, and when it's time to see a doctor — and
        then <a routerLink="/which-specialist-to-see">which specialist to see</a>.
      </p>

      <h2>Better than Googling your symptoms</h2>
      <p>
        Searching symptoms online means wading through generic articles written for everyone and
        no one — and often ending up more anxious than informed. An
        <a routerLink="/ai-doctor">AI health assistant</a> responds to <em>your</em> description: your
        symptoms, your timeline, your context. One structured answer instead of twenty open tabs,
        plus a shareable summary for your next real consultation.
      </p>

      <h2>Frequently asked questions</h2>
      <details>
        <summary>Is the health guide free to use?</summary>
        <p>Yes. Asking questions, checking symptoms, and decoding reports are all free, with no sign-up.</p>
      </details>
      <details>
        <summary>Can it replace my doctor?</summary>
        <p>
          No — and it doesn't try to. DoctoGuide is an educational guide that helps you arrive at
          your doctor's clinic informed, with the right specialist chosen and the right questions
          ready.
        </p>
      </details>
      <details>
        <summary>What languages does it support?</summary>
        <p>
          Any language you're comfortable with — English, Hindi, Hinglish, and more. Type the
          way you talk and the AI replies in the same language. Available worldwide.
        </p>
      </details>
    </app-seo-page-layout>
  `,
})
export class HealthGuidePageComponent implements OnInit, OnDestroy {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setJsonLd('page', {
      '@context': 'https://schema.org',
      '@type': 'MedicalWebPage',
      name: 'Free Online Health Guide',
      url: `${SITE_URL}/health-guide`,
      inLanguage: 'en',
      about: { '@type': 'MedicalAudience', audienceType: 'Patient' },
    });
    this.seo.setJsonLd('faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is the online health guide free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Asking questions, checking symptoms, and decoding reports are all free, with no sign-up.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can an online health guide replace my doctor?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No — and it does not try to. DoctoGuide is an educational guide that helps you arrive at your doctor informed, with the right specialist chosen and the right questions ready.',
          },
        },
        {
          '@type': 'Question',
          name: 'What languages does DoctoGuide support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Any language you're comfortable with — English, Hindi, Hinglish, and more. Type the way you talk and the AI replies in the same language. Available worldwide.",
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
