#!/usr/bin/env node
/**
 * Post-build SEO step. Runs after `ng build` (prerender).
 *
 * 1. Generates sitemap.xml from the routes that were actually prerendered, so the
 *    sitemap can never drift from what is deployed. The previous sitemap was a
 *    hand-maintained file with hardcoded lastmod dates.
 * 2. Copies the prerendered /404 page to 404.html at the output root, which is
 *    where static hosts (Vercel included) look for a custom 404 to serve with a
 *    real 404 status.
 *
 * No dependencies beyond Node's standard library.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITE_URL = 'https://doctoguide.knocdoc.in';
const OUT_DIR = path.resolve(__dirname, '..', 'dist', 'doctoguide', 'browser');

/**
 * Routes that must never appear in the sitemap, even if prerendered.
 * `/start` is the Google Ads landing page: prerendered so AdsBot sees real
 * HTML, but noindex and never submitted for organic indexing.
 */
const EXCLUDED = new Set(['/404', '/start']);

/** Priority by route. Anything unlisted falls back to DEFAULT_PRIORITY. */
const PRIORITY = {
  '/': '1.0',
  '/privacy': '0.3',
  '/terms': '0.3',
  '/disclaimer': '0.4',
  '/contact': '0.5',
  '/health-topics': '0.7',
};
const DEFAULT_PRIORITY = '0.8';

const CHANGEFREQ = {
  '/': 'weekly',
  '/privacy': 'yearly',
  '/terms': 'yearly',
  '/disclaimer': 'yearly',
};
const DEFAULT_CHANGEFREQ = 'monthly';

/**
 * A single date for every URL, taken from the last commit. Honest ("the site was
 * last changed then") and stable across rebuilds — stamping today's date on every
 * URL each deploy would tell Google everything changed when nothing did.
 */
function lastModified() {
  try {
    const iso = execSync('git log -1 --format=%cI', {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    if (iso) return iso.slice(0, 10);
  } catch {
    // Not a git checkout (or git unavailable) — fall through to today.
  }
  return new Date().toISOString().slice(0, 10);
}

/** Every prerendered route, derived from the index.html files on disk. */
function collectRoutes(dir, base = '') {
  const routes = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'assets') continue;

    const childDir = path.join(dir, entry.name);
    const childRoute = `${base}/${entry.name}`;

    if (fs.existsSync(path.join(childDir, 'index.html'))) {
      routes.push(childRoute);
    }
    routes.push(...collectRoutes(childDir, childRoute));
  }
  return routes;
}

function buildSitemap(routes, lastmod) {
  const urls = routes
    .map((route) => {
      const loc = route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`;
      const priority = PRIORITY[route] || DEFAULT_PRIORITY;
      const changefreq = CHANGEFREQ[route] || DEFAULT_CHANGEFREQ;
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function main() {
  if (!fs.existsSync(OUT_DIR)) {
    console.error(`[postbuild-seo] Output directory not found: ${OUT_DIR}`);
    process.exit(1);
  }

  // --- sitemap ---------------------------------------------------------------
  const routes = ['/', ...collectRoutes(OUT_DIR)]
    .filter((r) => !EXCLUDED.has(r))
    .sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));

  const lastmod = lastModified();
  fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), buildSitemap(routes, lastmod), 'utf8');
  console.log(`[postbuild-seo] sitemap.xml written with ${routes.length} URLs (lastmod ${lastmod}).`);

  // --- 404 -------------------------------------------------------------------
  const prerendered404 = path.join(OUT_DIR, '404', 'index.html');
  if (fs.existsSync(prerendered404)) {
    fs.copyFileSync(prerendered404, path.join(OUT_DIR, '404.html'));
    console.log('[postbuild-seo] 404.html written from the prerendered /404 route.');
  } else {
    console.warn('[postbuild-seo] No prerendered /404 route found — 404.html not written.');
  }

  // --- strip build leftovers -------------------------------------------------
  // Angular's font inliner writes the pre-inlining page to index.original.html
  // and leaves it in the output. Deployed, that is a crawlable HTTP 200 duplicate
  // of the homepage carrying stale markup — exactly the kind of duplicate URL the
  // canonical work here exists to eliminate.
  for (const leftover of ['index.original.html']) {
    const file = path.join(OUT_DIR, leftover);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`[postbuild-seo] removed build leftover ${leftover}.`);
    }
  }

  // --- scrub the ad landing page ---------------------------------------------
  // index.html carries a site-wide JSON-LD @graph (WebSite + SoftwareApplication)
  // whose descriptions say "symptom checker", "Describe your symptoms",
  // "MedicalAudience", "HealthApplication". Angular copies that <head> into every
  // prerendered route, so it lands on /start too — a machine-readable
  // personal-health signal on the one page that exists to carry none
  // (ADS_COMPLIANCE_PLAN.md 3.3). The block is valuable everywhere else, so it is
  // removed here rather than deleted from src/index.html.
  const startPage = path.join(OUT_DIR, 'start', 'index.html');
  if (fs.existsSync(startPage)) {
    const before = fs.readFileSync(startPage, 'utf8');
    const after = before.replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g,
      '',
    );
    if (after === before) {
      console.warn('[postbuild-seo] /start carried no JSON-LD to strip — check src/index.html.');
    } else {
      fs.writeFileSync(startPage, after, 'utf8');
      console.log('[postbuild-seo] stripped site-wide JSON-LD from /start (ad landing page).');
    }
    // og:image / twitter:image point at assets/og-image.png, whose artwork reads
    // "Free AI Doctor & Symptom Checker — Instant health guidance, find the right
    // specialist". Image text is OCR-readable, so on this page the card image is a
    // health signal in picture form. manifest.webmanifest is dropped for the same
    // reason: its description names a symptom checker. Both stay intact for every
    // other route; /start simply stops referencing them.
    let scrubbed = after
      // HTML comments ship to the crawler like any other bytes. index.html's
      // comments explain the JSON-LD graph and say "provides medical care" /
      // "MedicalOrganization" — health vocabulary reaching /start through
      // commentary nobody reads. Strip them here (only on this page; they are
      // useful documentation everywhere else).
      .replace(/<!--[\s\S]*?-->\s*/g, '')
      .replace(/<meta property="og:image(:width|:height)?" content="[^"]*">\s*/g, '')
      .replace(/<meta name="twitter:image" content="[^"]*">\s*/g, '')
      .replace(/<meta name="twitter:card" content="[^"]*">\s*/g, '')
      .replace(/<link rel="manifest" href="[^"]*">\s*/g, '');
    if (scrubbed !== after) {
      fs.writeFileSync(startPage, scrubbed, 'utf8');
      console.log('[postbuild-seo] stripped og:image, twitter:image and manifest link from /start.');
    }

    // Fail the build rather than ship a regression: any of this vocabulary in the
    // rendered HTML puts the page back in Google's health interest category, and
    // it is easy to reintroduce from a shared component or a copied meta string.
    const BANNED = /\b(health|healthcare|medical|medicine|doctor|doctors|physician|clinic|clinical|patient|symptom|symptoms|diagnos\w*|treatment|prescription|speciality|specialist|specialities|practitioner|consultation|telemedicine|emergency|hospital)\b/i;
    const hit = scrubbed.match(BANNED);
    if (hit) {
      const at = scrubbed.indexOf(hit[0]);
      console.error(`[postbuild-seo] FAIL: /start contains "${hit[0]}" — ...${scrubbed.slice(Math.max(0, at - 90), at + 90).replace(/\s+/g, ' ')}...`);
      console.error('[postbuild-seo] The ad landing page must carry no health vocabulary, in either direction. See ADS_COMPLIANCE_PLAN.md 3.3.');
      process.exit(1);
    }
  } else {
    console.warn('[postbuild-seo] /start was not prerendered — the Ads landing page is missing.');
  }

  // --- environment check -----------------------------------------------------
  // The production build MUST have swapped environment.ts for environment.prod.ts
  // (angular.json -> build.configurations.production.fileReplacements).
  //
  // This shipped broken once: the fileReplacements block was lost in the v2
  // migration, so every production and Capacitor bundle carried the DEV
  // environment — serverUrl "http://localhost:3000" and siteUrl
  // "http://localhost:4700". It fails silently and looks like an analytics bug,
  // because the app still boots and Firebase Analytics still initialises (the
  // firebaseConfig is identical in both files); what dies is every backend call,
  // and with it every conversion event logged from a success callback —
  // sign_up, login, report_generated, report_analysed, first_message_sent.
  const devHosts = ['localhost:3000', 'localhost:4700'];
  const bundles = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.js'));
  for (const host of devHosts) {
    const bad = bundles.filter((f) =>
      fs.readFileSync(path.join(OUT_DIR, f), 'utf8').includes(host),
    );
    if (bad.length) {
      console.error(`[postbuild-seo] FAIL: production bundle contains "${host}" (${bad.join(', ')}).`);
      console.error('[postbuild-seo] environment.prod.ts was not substituted. Check fileReplacements in angular.json.');
      process.exit(1);
    }
  }
  console.log('[postbuild-seo] Environment check passed (no dev hosts in the production bundle).');

  // --- sanity check ----------------------------------------------------------
  // A prerender that silently produced empty shells is the exact failure this
  // whole pipeline exists to prevent, so fail the build rather than deploy it.
  const home = fs.readFileSync(path.join(OUT_DIR, 'index.html'), 'utf8');
  if (!/<h1[\s>]/.test(home)) {
    console.error('[postbuild-seo] FAIL: prerendered homepage contains no <h1>. Prerender did not run correctly.');
    process.exit(1);
  }
  console.log('[postbuild-seo] Prerender sanity check passed (homepage has an <h1>).');
}

main();
