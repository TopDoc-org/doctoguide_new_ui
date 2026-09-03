import { inject, Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { isBrowserPlatform, storage } from '../platform/platform';

export interface EmergencyNumbers {
  all: string;
  ambulance: string;
  police?: string;
  fire?: string;
}

interface CountryEntry {
  name: string | null;
  emergency: EmergencyNumbers;
}

type CountryMap = { default: CountryEntry } & Record<string, CountryEntry>;

interface CachedCountry {
  countryCode: string | null;
  countryName: string | null;
  emergencyNumbers: EmergencyNumbers;
  ts: number; // epoch ms when resolved
}

const LS_COUNTRY = 'aiDoctorCountry';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COUNTRIES_URL = 'assets/countries.json';

// Single source of truth for country context (emergency numbers + country name).
// Detection is IP-based (no permission prompt), resolved once and cached in
// localStorage so refreshes/return visits skip the network call entirely.
// Every failure path degrades to the environment fallback — never blocks the UI.
//
// NOTE: this lives in core/, not in the triage feature where v1 kept it,
// because SeoService (core) depends on it for the %COUNTRY% token. A core ->
// feature import would be the wrong way round.
@Injectable({ providedIn: 'root' })
export class CountryService {
  countryCode: string | null = null;
  countryName: string | null = null;
  emergencyNumbers: EmergencyNumbers = environment.emergencyNumbers;

  private http = inject(HttpClient);
  private map: CountryMap | null = null;
  private ready: Promise<void> | null = null;
  private readonly isBrowser = isBrowserPlatform();

  // Idempotent: safe to call from multiple components; resolves once.
  //
  // During prerender this resolves immediately with a null (neutral) country.
  // The isBrowser gate here is LOAD-BEARING and must not be removed: detecting
  // via IP on the server would bake the BUILD MACHINE's country into the
  // prerendered HTML of every page, and would fire 22 pointless IP lookups per
  // build. With it, SeoService.withCountry() collapses the %COUNTRY% token
  // instead, which is the correct neutral output.
  init(): Promise<void> {
    if (!this.isBrowser) return Promise.resolve();
    if (!this.ready) this.ready = this.resolve();
    return this.ready;
  }

  private async resolve(): Promise<void> {
    // 1. Fresh cache -> no network at all.
    const cached = this.readCache();
    if (cached) {
      this.apply(cached);
      this.logDetected(cached, 'localStorage cache');
      return;
    }

    // 2. Detect country code via IP, then map to emergency numbers.
    const code = await this.detectCountryCode();
    const map = await this.loadMap();
    const entry = (code && map[code]) || map['default'];

    const resolved: CachedCountry = {
      countryCode: code,
      countryName: entry.name,
      emergencyNumbers: entry.emergency,
      ts: Date.now(),
    };
    this.apply(resolved);
    this.writeCache(resolved);
    this.logDetected(resolved, 'IP lookup (get.geojs.io)');
  }

  /**
   * Dev-only trace of the country this visitor was placed in, and where that
   * came from — cache or a fresh lookup. Country detection is otherwise
   * invisible apart from the banner, which makes a stale cached country hard to
   * spot. isDevMode() keeps it out of production builds.
   */
  private logDetected(c: CachedCountry, via: string): void {
    if (!isDevMode()) return;
    console.log(
      `%c📍 country%c ${c.countryName ?? 'unknown'} (${c.countryCode ?? '--'}) via ${via}`,
      'background:#0b7;color:#fff;padding:1px 5px;border-radius:3px',
      'color:inherit',
      { ...c, resolvedAt: new Date(c.ts).toISOString() },
    );
  }

  /**
   * Country names that read as "in **the** X" rather than "in X" — the United
   * States, the Netherlands, the Philippines, the Czech Republic, and so on.
   * Matches 19 of the 204 names in countries.json.
   */
  private static readonly NEEDS_ARTICLE =
    /\b(States|Kingdom|Republic|Emirates|Islands|Netherlands|Philippines|Bahamas|Gambia|Maldives|Comoros|Seychelles|Federation|Congo)\b/;

  /** " in India" / " in the United States" / "" when the country is unknown. */
  get inCountry(): string {
    const name = this.countryName;
    if (!name) return '';
    return CountryService.NEEDS_ARTICLE.test(name) ? ` in the ${name}` : ` in ${name}`;
  }

  /**
   * Emergency numbers as user-facing text, deduplicated and safe when the
   * country is unknown. Two problems this exists to solve:
   *
   *  - 84 of the 204 entries in countries.json use the SAME number for `all`
   *    and `ambulance` (US 911, UK 999, …). The old
   *    "call {{all}} or {{ambulance}}" markup rendered "call 911 or 911".
   *  - Before IP detection resolves — which includes every prerendered page,
   *    where detection never runs at all — the country is unknown but
   *    `emergencyNumbers` already holds the '112' environment fallback, so a
   *    visitor was told to dial a number that may not work where they are.
   */
  get emergencyNumbersText(): string {
    if (!this.countryName) return 'your local emergency services (112 / 911)';
    const { all, ambulance } = this.emergencyNumbers;
    if (!ambulance || ambulance === all) return all;
    return `${all} or ${ambulance} (ambulance)`;
  }

  /**
   * Complete, always-grammatical emergency sentence. Prefer this over stitching
   * `emergencyNumbers` into markup by hand — that is what produced "call 911 or
   * 911" in the first place.
   *
   *   unknown country → "In a medical emergency, call your local emergency
   *                      services (112 / 911) immediately."
   *   India           → "In a medical emergency in India, call 112 or 108
   *                      (ambulance) immediately."
   *   United States   → "In a medical emergency in the United States, call 911
   *                      immediately."
   */
  get emergencySentence(): string {
    return `In a medical emergency${this.inCountry}, call ${this.emergencyNumbersText} immediately.`;
  }

  private apply(c: CachedCountry): void {
    this.countryCode = c.countryCode;
    this.countryName = c.countryName;
    this.emergencyNumbers = c.emergencyNumbers || environment.emergencyNumbers;
  }

  // --- IP geolocation (free, keyless, CORS-enabled). geojs primary, ipwho fallback. ---
  // v1 logged every step to the console in production; dropped here.
  private async detectCountryCode(): Promise<string | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ country?: string }>('https://get.geojs.io/v1/ip/country.json'),
      );
      const code = (res?.country || '').toUpperCase();
      if (code) return code;
    } catch {
      /* geojs.io unreachable -> try the fallback */
    }
    try {
      const res = await firstValueFrom(
        this.http.get<{ country_code?: string }>('https://ipwho.is/'),
      );
      const code = (res?.country_code || '').toUpperCase();
      if (code) return code;
    } catch {
      /* both failed -> caller uses the default entry */
    }
    return null;
  }

  private async loadMap(): Promise<CountryMap> {
    if (this.map) return this.map;
    try {
      this.map = await firstValueFrom(this.http.get<CountryMap>(COUNTRIES_URL));
    } catch {
      // JSON unreachable -> synthesize a default from environment.
      this.map = {
        default: { name: null, emergency: environment.emergencyNumbers },
      } as CountryMap;
    }
    return this.map;
  }

  private readCache(): CachedCountry | null {
    try {
      const raw = storage.get(LS_COUNTRY);
      if (!raw) return null;
      const c = JSON.parse(raw) as CachedCountry;
      if (!c?.emergencyNumbers || typeof c.ts !== 'number') return null;
      if (Date.now() - c.ts > CACHE_TTL_MS) return null;
      return c;
    } catch {
      return null;
    }
  }

  private writeCache(c: CachedCountry): void {
    storage.set(LS_COUNTRY, JSON.stringify(c));
  }
}
