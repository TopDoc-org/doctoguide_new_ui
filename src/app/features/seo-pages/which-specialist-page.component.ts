import { Component, OnDestroy, OnInit } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_URL } from '../../core/config/site';
import { RouterLink } from '@angular/router';
import { SeoPageLayoutComponent } from '../../layouts/seo-page-layout/seo-page-layout.component';

@Component({
  selector: 'app-which-specialist-page',
  standalone: true,
  imports: [RouterLink, SeoPageLayoutComponent],
  template: `
    <app-seo-page-layout
      heading="Not sure which doctor to see? Start here."
      lede="Picking the wrong specialist costs time, money, and often a second consultation. Describe your symptoms to DoctoGuide and get pointed to the right speciality — before you book."
      ctaTitle="Find the right specialist for your symptoms"
      ctaLabel="Describe your symptoms — free"
    >
      <h2>Common symptoms and the specialist who handles them</h2>
      <p>
        A quick reference. Your situation may differ — when in doubt, describe your symptoms to
        DoctoGuide and get guidance specific to you.
      </p>
      <table>
        <thead>
          <tr><th>Symptom or concern</th><th>Specialist to consider</th></tr>
        </thead>
        <tbody>
          <tr><td>Chest pain, palpitations, breathlessness on exertion</td><td>Cardiologist — severe or sudden chest pain is an emergency: call your local emergency number</td></tr>
          <tr><td>Skin rash, acne, hair loss, nail changes</td><td>Dermatologist</td></tr>
          <tr><td>Persistent headache, dizziness, numbness, seizures</td><td>Neurologist</td></tr>
          <tr><td>Stomach pain, acidity, bloating, bowel changes</td><td>Gastroenterologist</td></tr>
          <tr><td>Joint pain, back pain, fractures, sports injuries</td><td>Orthopaedic specialist</td></tr>
          <tr><td>Ear pain, sinus issues, sore throat, voice changes</td><td>ENT (otolaryngologist)</td></tr>
          <tr><td>Blurred vision, eye pain, redness</td><td>Ophthalmologist</td></tr>
          <tr><td>Urinary problems, kidney stones</td><td>Urologist / Nephrologist</td></tr>
          <tr><td>Pregnancy, periods, menopause, women's health</td><td>Gynaecologist (OB-GYN)</td></tr>
          <tr><td>Child's fever, growth, vaccinations</td><td>Paediatrician</td></tr>
          <tr><td>Diabetes, thyroid, hormonal issues</td><td>Endocrinologist</td></tr>
          <tr><td>Anxiety, low mood, sleep problems</td><td>Psychiatrist / Psychologist</td></tr>
          <tr><td>Cough, wheezing, asthma, breathing trouble</td><td>Pulmonologist</td></tr>
          <tr><td>Allergies, frequent infections</td><td>Allergist / Immunologist</td></tr>
          <tr><td>General check-up, unclear symptoms</td><td>General physician / family doctor first</td></tr>
        </tbody>
      </table>

      <h2>How DoctoGuide picks the right speciality for you</h2>
      <p>
        Symptoms rarely map one-to-one to a speciality — chest pain can be cardiac, muscular,
        digestive, or anxiety-related. DoctoGuide reads your full description (what, where, how
        long, what makes it better or worse) and suggests the speciality that actually fits,
        starting with our free <a routerLink="/symptom-checker">AI symptom checker</a>.
      </p>

      <h2>When to skip the specialist and seek emergency care</h2>
      <ul>
        <li>Severe chest pain or pressure, especially with sweating or breathlessness</li>
        <li>Sudden weakness or numbness on one side, slurred speech, facial droop</li>
        <li>Severe difficulty breathing</li>
        <li>Heavy uncontrolled bleeding, major injury</li>
        <li>Sudden severe headache unlike any before</li>
      </ul>
      <p>
        For these, call your local emergency number immediately —
        <a routerLink="/emergency-numbers">find your country's emergency number here</a>.
      </p>

      <h2>Frequently asked questions</h2>
      <details>
        <summary>Should I see a general physician first or go straight to a specialist?</summary>
        <p>
          If symptoms are unclear or affect your whole body (fatigue, fever, weight changes), a
          general physician is the right start. If the problem is clearly in one system — skin,
          eyes, joints — a specialist saves a step. DoctoGuide tells you which case yours is.
        </p>
      </details>
      <details>
        <summary>What if I pick the wrong specialist?</summary>
        <p>
          It usually means a second consultation and a referral — extra cost and delay. That's
          exactly what DoctoGuide is built to prevent: describe your symptoms first, then book.
        </p>
      </details>
      <details>
        <summary>Can DoctoGuide also find doctors near me?</summary>
        <p>
          Yes. After suggesting the speciality, DoctoGuide can help you find doctors near
          you, matched to what you actually need.
        </p>
      </details>
    </app-seo-page-layout>
  `,
})
export class WhichSpecialistPageComponent implements OnInit, OnDestroy {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setJsonLd('page', {
      '@context': 'https://schema.org',
      '@type': 'MedicalWebPage',
      name: 'Which Specialist Should I See?',
      url: `${SITE_URL}/which-specialist-to-see`,
      inLanguage: 'en',
      about: { '@type': 'MedicalAudience', audienceType: 'Patient' },
    });
    this.seo.setJsonLd('faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Should I see a general physician first or go straight to a specialist?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'If symptoms are unclear or affect your whole body (fatigue, fever, weight changes), a general physician is the right start. If the problem is clearly in one system — skin, eyes, joints — a specialist saves a step. DoctoGuide tells you which case yours is.',
          },
        },
        {
          '@type': 'Question',
          name: 'What happens if I pick the wrong specialist?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'It usually means a second consultation and a referral — extra cost and delay. DoctoGuide is built to prevent that: describe your symptoms first, then book the right doctor.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can DoctoGuide also find doctors near me?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. After suggesting the speciality, DoctoGuide can help you find doctors near you, matched to what you actually need.',
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
