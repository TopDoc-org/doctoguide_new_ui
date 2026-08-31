import { Component, OnDestroy, OnInit } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_URL } from '../../core/config/site';
import { RouterLink } from '@angular/router';
import { SeoPageLayoutComponent } from '../../layouts/seo-page-layout/seo-page-layout.component';

/**
 * Medical safety page. This is the YMYL trust anchor: it states plainly what the
 * AI can and cannot do, how it fails, and when to stop using it and seek care.
 *
 * Deliberately conservative. No clinical validation, accuracy figures, medical
 * review board, or regulatory status is claimed, because none is documented in
 * this project. Claiming any of those without evidence would be exactly the kind
 * of unsupported medical claim this page exists to avoid.
 */
@Component({
  selector: 'app-medical-safety-page',
  standalone: true,
  imports: [RouterLink, SeoPageLayoutComponent],
  template: `
    <app-seo-page-layout
      heading="Medical safety and AI limitations"
      lede="DoctoGuide gives you health information, not a diagnosis. This page explains exactly what that means, where the AI can be wrong, and when you should stop reading and get medical help."
      ctaTitle="Ready to describe your symptoms?"
      ctaLabel="Start with DoctoGuide"
    >
      <h2>Get help immediately if any of these apply</h2>
      <p>
        Do not use DoctoGuide, or any symptom checker, to decide whether an emergency is an
        emergency. In India, call <strong>112</strong> for any emergency or <strong>108</strong> for
        an ambulance. Elsewhere, use your
        <a routerLink="/emergency-numbers">local emergency number</a>. Seek help right away for:
      </p>
      <ul>
        <li>Chest pain or pressure, or pain spreading to the arm, jaw, or back.</li>
        <li>Difficulty breathing, or breathlessness at rest.</li>
        <li>Sudden weakness or numbness on one side, a drooping face, or sudden trouble speaking.</li>
        <li>Sudden confusion, a seizure, fainting, or unresponsiveness.</li>
        <li>Heavy bleeding that will not stop, or vomiting blood.</li>
        <li>A severe allergic reaction — swelling of the face, lips, or throat.</li>
        <li>Thoughts of harming yourself or someone else.</li>
        <li>A high fever in an infant, or a child who is unusually drowsy or hard to wake.</li>
      </ul>
      <p>
        This list is not exhaustive. Anything that feels severe, sudden, or rapidly worsening
        warrants immediate medical attention regardless of what any tool tells you.
      </p>

      <h2>What DoctoGuide can do</h2>
      <ul>
        <li>Take a symptom description in everyday language and ask structured follow-up questions.</li>
        <li>Explain, in plain terms, what a set of symptoms is commonly associated with.</li>
        <li>Give a general sense of whether something warrants urgent, soon, or routine attention.</li>
        <li>Suggest which medical speciality usually handles a concern like yours.</li>
        <li>Produce a written summary you can bring to a consultation.</li>
        <li>Explain unfamiliar terms from a lab report or a medicine label in plain language.</li>
      </ul>

      <h2>What DoctoGuide cannot do</h2>
      <ul>
        <li><strong>It cannot diagnose you.</strong> A diagnosis requires examination, history, and often tests. DoctoGuide has none of those.</li>
        <li><strong>It cannot prescribe.</strong> It will not recommend a medicine, a dose, or a change to an existing prescription.</li>
        <li><strong>It cannot treat.</strong> No treatment plans, no procedures, no therapy.</li>
        <li><strong>It cannot examine you.</strong> It cannot see, listen to, touch, or test anything.</li>
        <li><strong>It cannot rule anything out.</strong> A reassuring answer is not clearance.</li>
        <li><strong>It cannot handle emergencies.</strong> It is a web page, not a responder.</li>
        <li><strong>It is not a licensed physician</strong> and does not replace one.</li>
      </ul>

      <h2>How the AI can be wrong</h2>
      <p>
        DoctoGuide is built on large language models. Understanding how these fail is part of using
        the tool safely:
      </p>
      <ul>
        <li>
          <strong>It only knows what you tell it.</strong> A symptom you thought was irrelevant, or
          did not think to mention, can change the picture completely.
        </li>
        <li>
          <strong>It can state something incorrect with confidence.</strong> Fluent, well-organised
          output is not evidence of accuracy. Confidence in the wording is not confidence in the
          content.
        </li>
        <li>
          <strong>It reflects patterns, not your body.</strong> Guidance is drawn from how symptoms
          commonly present in general, which may not be how they present in you — age, pregnancy,
          existing conditions, and current medication all shift what matters.
        </li>
        <li>
          <strong>Rare presentations are where it is weakest.</strong> Uncommon conditions and
          atypical presentations of common ones are exactly what a pattern-matching system handles
          worst.
        </li>
      </ul>

      <h2>Using DoctoGuide safely</h2>
      <ol>
        <li>Treat the output as preparation for a consultation, not a substitute for one.</li>
        <li>Describe everything, including what seems unrelated or embarrassing.</li>
        <li>Mention your age, existing conditions, current medicines, and pregnancy if it applies.</li>
        <li>If the guidance says seek care urgently, act on it — do not seek a second opinion from another website.</li>
        <li>If a reassuring answer does not match how bad you feel, trust your body and see a doctor.</li>
        <li>Take the summary with you. It is most useful in the room with a clinician.</li>
        <li>Never delay care because a tool sounded reassuring.</li>
      </ol>

      <h2>DoctoGuide is not a replacement for a doctor</h2>
      <p>
        This is the single most important thing on this page. DoctoGuide exists to get you to the
        right doctor sooner and better prepared. It does not stand in for the examination, the
        clinical judgement, the tests, or the responsibility that a qualified clinician brings. If
        you are choosing between reading DoctoGuide and seeing a doctor, see the doctor.
      </p>

      <h2>Your information</h2>
      <p>
        You can use DoctoGuide without an account. What you type is used to generate your guidance
        and summary. The <a routerLink="/privacy">privacy policy</a> sets out collection, use, and
        retention in full.
      </p>

      <h2>Related pages</h2>
      <ul>
        <li><a routerLink="/disclaimer">Full medical disclaimer</a></li>
        <li><a routerLink="/about">About DoctoGuide and KnocDoc</a></li>
        <li><a routerLink="/how-it-works">How DoctoGuide works</a></li>
        <li><a routerLink="/emergency-numbers">Emergency numbers by country</a></li>
      </ul>
    </app-seo-page-layout>
  `,
})
export class MedicalSafetyPageComponent implements OnInit, OnDestroy {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Medical Safety', item: `${SITE_URL}/medical-safety` },
      ],
    });
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('breadcrumb');
  }
}
