import { Component, OnDestroy, OnInit } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_URL } from '../../core/config/site';
import { RouterLink } from '@angular/router';
import { SeoPageLayoutComponent } from '../../layouts/seo-page-layout/seo-page-layout.component';

@Component({
  selector: 'app-symptom-checker-page',
  standalone: true,
  imports: [RouterLink, SeoPageLayoutComponent],
  template: `
    <app-seo-page-layout
      heading="Check your symptoms with AI — free, no sign-up"
      lede="Describe what you're feeling in your own words. DoctoGuide's AI symptom checker gives you an instant, plain-language read on what could be going on, how urgent it is, and which specialist to see."
      ctaTitle="Check your symptoms now"
      ctaLabel="Start the free symptom checker"
    >
      <h2>How the AI symptom checker works</h2>
      <ol>
        <li><strong>Describe your symptoms</strong> — in plain language, the way you'd tell a friend. "Sore throat and mild fever for 3 days" is enough to start.</li>
        <li><strong>Answer a few follow-ups</strong> — the AI asks only what matters for your specific concern.</li>
        <li><strong>Get a clear summary</strong> — what could be going on, how urgent it looks, which specialist to see, and a shareable summary you can take to a doctor.</li>
      </ol>

      <h2>Why plain language beats checkbox quizzes</h2>
      <p>
        Most symptom checkers force your situation into fixed checklists, and important details
        fall through the gaps. DoctoGuide reads your actual description — including timing,
        context, and the small details checklists miss — so the guidance fits <em>your</em>
        situation, not a generic template.
      </p>

      <h2>What you get</h2>
      <ul>
        <li>A calm, structured explanation of what could be causing your symptoms.</li>
        <li>A sense of urgency: manage at home, see a doctor soon, or seek urgent care.</li>
        <li>The right specialist for your concern — see <a routerLink="/which-specialist-to-see">which specialist to see</a>.</li>
        <li>A clear, shareable summary for your next consultation.</li>
        <li>Help finding doctors near you when you're ready.</li>
      </ul>

      <h2>Safety and limits</h2>
      <p>
        DoctoGuide provides educational information, not a medical diagnosis. Many minor issues
        can be safely managed at home, and the symptom checker will say so when that's likely —
        but persistent, worsening, or severe symptoms always deserve a real doctor. For
        emergencies (severe chest pain, trouble breathing, sudden weakness, heavy bleeding), call
        your local emergency number immediately — see
        <a routerLink="/emergency-numbers">emergency numbers by country</a>.
      </p>

      <h2>Frequently asked questions</h2>
      <details>
        <summary>Is the symptom checker free?</summary>
        <p>Yes — completely free to use, with no sign-up and no credit card.</p>
      </details>
      <details>
        <summary>How accurate is an AI symptom checker?</summary>
        <p>
          It's a well-informed starting point, not a verdict. DoctoGuide helps you understand
          likely possibilities and urgency, then points you to the right specialist who can
          actually examine and diagnose you.
        </p>
      </details>
      <details>
        <summary>Can I check symptoms for my child or a family member?</summary>
        <p>
          Yes. Describe their symptoms, age, and context, and the guidance adapts — including
          when to see a paediatrician promptly.
        </p>
      </details>
    </app-seo-page-layout>
  `,
})
export class SymptomCheckerPageComponent implements OnInit, OnDestroy {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setJsonLd('page', {
      '@context': 'https://schema.org',
      '@type': 'MedicalWebPage',
      name: 'Free AI Symptom Checker',
      url: `${SITE_URL}/symptom-checker`,
      inLanguage: 'en',
      about: { '@type': 'MedicalAudience', audienceType: 'Patient' },
    });
    this.seo.setJsonLd('faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is the symptom checker free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes — completely free to use, with no sign-up and no credit card.',
          },
        },
        {
          '@type': 'Question',
          name: 'How accurate is an AI symptom checker?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'It is a well-informed starting point, not a verdict. DoctoGuide helps you understand likely possibilities and urgency, then points you to the right specialist who can actually examine and diagnose you.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I check symptoms for my child or a family member?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Describe their symptoms, age, and context, and the guidance adapts — including when to see a paediatrician promptly.',
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
