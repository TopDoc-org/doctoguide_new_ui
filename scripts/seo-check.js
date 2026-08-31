#!/usr/bin/env node
/**
 * SEO acceptance checks, run against the built output in dist/.
 *
 * These assert the things that actually broke this site: pages that rendered an
 * empty shell, every route claiming the homepage as its canonical, and duplicate
 * titles across twelve URLs. Unit tests in the browser would not have caught any
 * of them, because all three are properties of the deployed HTML.
 *
 * Usage:  npm run build && npm run seo:check
 * Exits non-zero on any failure, so it can gate a deploy.
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://doctoguide.knocdoc.in';
const OUT_DIR = path.resolve(__dirname, '..', 'dist', 'doctoguide', 'browser');

const failures = [];
const warnings = [];
let checks = 0;

function check(condition, message) {
  checks++;
  if (!condition) failures.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

/** Titles and descriptions are stored HTML-escaped; measure what a user sees. */
const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const first = (html, re) => {
  const m = html.match(re);
  return m ? decode(m[1].trim()) : null;
};

const countMatches = (html, re) => (html.match(re) || []).length;

const RE = {
  title: /<title[^>]*>([\s\S]*?)<\/title>/i,
  description: /<meta[^>]+name="description"[^>]+content="([^"]*)"/i,
  robots: /<meta[^>]+name="robots"[^>]+content="([^"]*)"/i,
  canonical: /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i,
  h1: /<h1[\s>]/gi,
  jsonLd: /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
};

const OG_TAGS = ['og:type', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image'];
const TWITTER_TAGS = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];

/** Every prerendered route on disk, as URL paths. */
function collectRoutes(dir, base = '') {
  const routes = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'assets') continue;
    const childDir = path.join(dir, entry.name);
    const childRoute = `${base}/${entry.name}`;
    if (fs.existsSync(path.join(childDir, 'index.html'))) routes.push(childRoute);
    routes.push(...collectRoutes(childDir, childRoute));
  }
  return routes;
}

function readRoute(route) {
  const file = route === '/' ? 'index.html' : path.join(route.slice(1), 'index.html');
  return fs.readFileSync(path.join(OUT_DIR, file), 'utf8');
}

function main() {
  if (!fs.existsSync(OUT_DIR)) {
    console.error(`FAIL: no build output at ${OUT_DIR}. Run "npm run build" first.`);
    process.exit(1);
  }
  // A failed build can leave the directory present but the entry point missing.
  // Say so plainly rather than throwing an ENOENT stack trace from readRoute().
  if (!fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
    console.error(`FAIL: ${OUT_DIR} has no index.html. The build did not complete — fix that first.`);
    process.exit(1);
  }

  const allRoutes = ['/', ...collectRoutes(OUT_DIR)];
  // Prerendered but deliberately not part of the organic surface: /404, and
  // /start (the Google Ads landing page — noindex and kept out of the sitemap
  // on purpose, see ADS_COMPLIANCE_PLAN.md). Both are asserted separately below.
  const NON_ORGANIC = new Set(['/404', '/start']);
  const publicRoutes = allRoutes.filter((r) => !NON_ORGANIC.has(r));

  // --- robots.txt ------------------------------------------------------------
  const robotsPath = path.join(OUT_DIR, 'robots.txt');
  check(fs.existsSync(robotsPath), 'robots.txt is missing from the build output.');
  if (fs.existsSync(robotsPath)) {
    const robots = fs.readFileSync(robotsPath, 'utf8');
    check(/^\s*Sitemap:\s*https:\/\//im.test(robots), 'robots.txt does not declare an https Sitemap.');
    check(
      !/^\s*Disallow:\s*\/\s*$/im.test(robots),
      'robots.txt contains "Disallow: /", which would block the entire site.',
    );
    for (const asset of ['/assets', '*.js', '*.css']) {
      check(
        !new RegExp(`^\\s*Disallow:\\s*${asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im').test(robots),
        `robots.txt blocks ${asset}, which crawlers need in order to render the page.`,
      );
    }
  }

  // --- sitemap.xml -----------------------------------------------------------
  const sitemapPath = path.join(OUT_DIR, 'sitemap.xml');
  check(fs.existsSync(sitemapPath), 'sitemap.xml is missing from the build output.');
  if (fs.existsSync(sitemapPath)) {
    const sitemap = fs.readFileSync(sitemapPath, 'utf8');
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    check(locs.length > 0, 'sitemap.xml contains no <loc> entries.');
    check(
      locs.every((l) => l.startsWith('https://')),
      'sitemap.xml contains a non-https URL.',
    );
    check(
      !locs.some((l) => l.includes('?')),
      'sitemap.xml contains a URL with query parameters.',
    );
    check(new Set(locs).size === locs.length, 'sitemap.xml contains duplicate URLs.');

    for (const priv of ['/triage', '/partner', '/admin', '/owner', '/404', '/start']) {
      check(
        !locs.some((l) => l === `${SITE_URL}${priv}` || l.startsWith(`${SITE_URL}${priv}/`)),
        `sitemap.xml lists ${priv}, which must not be indexed.`,
      );
    }

    // Every sitemap URL must correspond to a page that was actually built.
    const built = new Set(publicRoutes.map((r) => (r === '/' ? `${SITE_URL}/` : `${SITE_URL}${r}`)));
    for (const loc of locs) {
      check(built.has(loc), `sitemap.xml lists ${loc}, which has no prerendered page.`);
    }
    for (const b of built) {
      warn(locs.includes(b), `${b} was prerendered but is not listed in sitemap.xml.`);
    }
  }

  // --- no stray duplicate pages at the root ----------------------------------
  // Anything ending in .html at the output root is a live, crawlable URL. Only
  // 404.html and the Google verification file belong there.
  for (const entry of fs.readdirSync(OUT_DIR)) {
    if (!entry.endsWith('.html')) continue;
    check(
      entry === 'index.html' || entry === '404.html' || /^google[a-f0-9]+\.html$/.test(entry),
      `Unexpected HTML file at the output root: ${entry}. It would be a crawlable duplicate page.`,
    );
  }

  // --- 404 -------------------------------------------------------------------
  const notFoundPath = path.join(OUT_DIR, '404.html');
  check(fs.existsSync(notFoundPath), '404.html is missing — the host cannot serve a real 404.');
  if (fs.existsSync(notFoundPath)) {
    const html = fs.readFileSync(notFoundPath, 'utf8');
    const robots = first(html, RE.robots) || '';
    check(/noindex/i.test(robots), '404.html is not marked noindex.');
  }

  // --- /start (Google Ads landing page) --------------------------------------
  // It must exist, and it must be noindex. If either flips, paid traffic either
  // 404s or the page starts competing with the homepage in organic search.
  const startPath = path.join(OUT_DIR, 'start', 'index.html');
  check(fs.existsSync(startPath), '/start is missing — the Google Ads final URL would 404.');
  if (fs.existsSync(startPath)) {
    const html = fs.readFileSync(startPath, 'utf8');
    const robots = first(html, RE.robots) || '';
    check(/noindex/i.test(robots), '/start is not marked noindex.');
  }

  // --- per-page --------------------------------------------------------------
  const titles = new Map();
  const descriptions = new Map();

  for (const route of publicRoutes) {
    const html = readRoute(route);
    const where = `${route}:`;

    const h1Count = countMatches(html, RE.h1);
    check(h1Count === 1, `${where} expected exactly one <h1>, found ${h1Count}.`);

    const title = first(html, RE.title);
    check(!!title, `${where} has no <title>.`);
    if (title) {
      check(title.length >= 15, `${where} title is suspiciously short: "${title}".`);
      warn(title.length <= 65, `${where} title is ${title.length} chars and will likely be truncated.`);
      const seen = titles.get(title);
      check(!seen, `${where} title duplicates ${seen} ("${title}").`);
      titles.set(title, route);
    }

    const description = first(html, RE.description);
    check(!!description, `${where} has no meta description.`);
    if (description) {
      check(description.length >= 50, `${where} meta description is too short.`);
      const seen = descriptions.get(description);
      check(!seen, `${where} meta description duplicates ${seen}.`);
      descriptions.set(description, route);
    }

    const canonical = first(html, RE.canonical);
    check(!!canonical, `${where} has no canonical link.`);
    if (canonical) {
      check(canonical.startsWith('https://'), `${where} canonical is not https: ${canonical}.`);
      const expected = route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`;
      check(
        canonical === expected,
        `${where} canonical is "${canonical}" but should be "${expected}".`,
      );
    }

    const robots = first(html, RE.robots);
    check(
      !robots || !/noindex/i.test(robots),
      `${where} is a public page but is marked noindex ("${robots}").`,
    );

    for (const tag of OG_TAGS) {
      check(
        new RegExp(`<meta[^>]+property="${tag}"[^>]+content="[^"]+"`, 'i').test(html),
        `${where} is missing ${tag}.`,
      );
    }
    for (const tag of TWITTER_TAGS) {
      check(
        new RegExp(`<meta[^>]+name="${tag}"[^>]+content="[^"]+"`, 'i').test(html),
        `${where} is missing ${tag}.`,
      );
    }

    // The failure that made this site invisible: a page that renders nothing
    // until JavaScript executes.
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    check(
      text.split(' ').length >= 150,
      `${where} has only ${text.split(' ').length} words of prerendered text — it may not have prerendered.`,
    );

    let ld;
    let ldCount = 0;
    while ((ld = RE.jsonLd.exec(html)) !== null) {
      ldCount++;
      try {
        JSON.parse(ld[1]);
      } catch (e) {
        check(false, `${where} has invalid JSON-LD in block ${ldCount}: ${e.message}`);
      }
    }
    RE.jsonLd.lastIndex = 0;
    check(ldCount > 0, `${where} has no JSON-LD structured data.`);
  }

  // --- report ----------------------------------------------------------------
  console.log(`\nSEO check — ${publicRoutes.length} public routes, ${checks} assertions.\n`);

  for (const w of warnings) console.log(`  WARN  ${w}`);
  if (warnings.length) console.log('');

  if (failures.length) {
    for (const f of failures) console.error(`  FAIL  ${f}`);
    console.error(`\n${failures.length} SEO check(s) failed.\n`);
    process.exit(1);
  }

  console.log(`  All SEO checks passed.${warnings.length ? ` (${warnings.length} warning(s))` : ''}\n`);
}

main();
