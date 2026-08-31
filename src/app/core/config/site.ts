/**
 * Canonical site origin for canonical + Open Graph URLs.
 *
 * Hard-coded, NOT read from `environment.siteUrl`, and that is deliberate:
 * canonical and og:url must always name the public production origin no matter
 * which build configuration produced the HTML. Deriving it from the environment
 * would emit `http://localhost:4700` canonicals in a development build.
 *
 * `environment.siteUrl` is a different thing — the origin used to BUILD links
 * the user will follow (partner campaign URLs), which does vary by environment.
 */
export const SITE_URL = 'https://doctoguide.knocdoc.in';

/**
 * Placeholder for the user's country in SEO strings (route `data.seo` + DEFAULTS).
 * Resolved at runtime to the detected country. When the country is unknown (during
 * prerender, or before IP detection resolves) the token is dropped gracefully, so
 * use it only in suffix positions like " in %COUNTRY%" / " for %COUNTRY%" — never
 * mid-sentence where its removal would leave a grammar hole.
 */
export const COUNTRY_TOKEN = '%COUNTRY%';
