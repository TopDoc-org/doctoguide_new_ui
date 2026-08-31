import { inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { CountryService } from '../country/country.service';
import { COUNTRY_TOKEN, SITE_URL } from '../config/site';

/** Per-route SEO metadata, attached via route `data: { seo: {...} }`. */
export interface SeoData {
  title?: string;
  description?: string;
  /** Robots directive, e.g. 'index,follow' or 'noindex,nofollow'. */
  robots?: string;
  /** Absolute OG image URL. Falls back to the default social card. */
  image?: string;
}

const DEFAULTS: Required<SeoData> = {
  title: 'DoctoGuide — AI Health Assistant & Symptom Checker | KnocDoc',
  description:
    `DoctoGuide is a free AI health assistant and symptom checker by KnocDoc. Describe your symptoms, understand possible explanations and urgency, and learn which specialist to see in ${COUNTRY_TOKEN}. No sign-up.`,
  robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
  image: `${SITE_URL}/assets/og-image.png`,
};

/**
 * Updates the document title, meta tags, canonical link, and Open Graph /
 * Twitter tags on each route change. This is the client-side SEO layer for the
 * SPA — Googlebot renders JS and will pick these up, but note that non-JS social
 * crawlers (WhatsApp, Facebook) only read the static tags baked into index.html
 * or written into the prerendered HTML.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);
  private country = inject(CountryService);

  // Last applied route SEO, so we can re-render once the country resolves async.
  private lastData: SeoData | undefined;
  private lastUrl: string | null = null;

  constructor() {
    // Country detection is async (IP-based). Re-apply the current route's tags
    // once it resolves so %COUNTRY% swaps to the detected place. During
    // prerender init() resolves immediately with a null country, so this is a
    // no-op there and the token collapses instead.
    void this.country.init().then(() => {
      if (this.lastUrl !== null) this.update(this.lastData, this.lastUrl);
    });
  }

  /**
   * Swap the country placeholder for the detected country. When unknown (prerender,
   * or before IP detection resolves) collapse the token and its " in " / " for "
   * preposition so the sentence stays world-neutral and grammatical.
   */
  private withCountry(s: string | undefined): string | undefined {
    if (!s) return s;
    const name = this.country.countryName;
    if (name) return s.split(COUNTRY_TOKEN).join(name);
    return s
      .replace(/\s*(in|for)\s+%COUNTRY%/gi, '')
      .split(COUNTRY_TOKEN).join('')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Apply SEO metadata for the current route.
   * @param data    merged `seo` data from the activated route chain
   * @param urlPath router URL (without query string) for the canonical link
   */
  update(data: SeoData | undefined, urlPath: string): void {
    this.lastData = data;
    this.lastUrl = urlPath;
    const merged = { ...DEFAULTS, ...(data ?? {}) };
    const seo = {
      ...merged,
      title: this.withCountry(merged.title)!,
      description: this.withCountry(merged.description)!,
    };
    const canonical = `${SITE_URL}${urlPath === '/' ? '/' : urlPath.replace(/\/$/, '')}`;

    this.title.setTitle(seo.title);
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({ name: 'robots', content: seo.robots });

    // No hreflang tags by design: one URL set, one language, runtime country
    // personalization — there are no language/region URL alternates to declare.
    // Revisit only if country-specific URLs (e.g. /in/...) ever ship.
    this.setCanonical(canonical);

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: seo.title });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:image', content: seo.image });

    // Twitter
    this.meta.updateTag({ name: 'twitter:title', content: seo.title });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });
    this.meta.updateTag({ name: 'twitter:image', content: seo.image });
  }

  /** Insert or update the <link rel="canonical"> element. */
  private setCanonical(href: string): void {
    let link = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  /**
   * Insert or replace a JSON-LD <script> block, keyed by id so it can be
   * swapped per route.
   */
  setJsonLd(id: string, schema: object): void {
    const elementId = `ld-${id}`;
    let script = this.doc.getElementById(elementId) as HTMLScriptElement | null;
    if (!script) {
      script = this.doc.createElement('script');
      script.id = elementId;
      script.type = 'application/ld+json';
      this.doc.head.appendChild(script);
    }
    script.text = JSON.stringify(schema);
  }

  /** Remove a JSON-LD block added via setJsonLd (call from ngOnDestroy of the owning page). */
  removeJsonLd(id: string): void {
    this.doc.getElementById(`ld-${id}`)?.remove();
  }
}
