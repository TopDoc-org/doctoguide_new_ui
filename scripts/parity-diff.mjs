/**
 * Parity diff: prerendered output vs the CURRENT design baseline.
 *
 * Compares, per route, the things that are the actual SEO/content contract:
 *   <title>, meta description, meta robots, canonical, the social card image,
 *   the <h1>, and the normalized <main> text.
 *
 * WHAT THIS GUARDS CHANGED IN 2.0.
 *
 * It used to diff against ../doctoguide-baseline, the Angular 14 v1 output, and
 * a difference meant "the port drifted". That job is DONE and the gate is
 * retired: the 2.0 redesign deliberately rewrites copy and structure on the
 * public routes, so v1 is no longer the thing to be equal to.
 *
 * What it guards now is UNINTENDED drift. The baseline is
 * ../doctoguide-v2-baseline — a snapshot of reviewed 2.0 output — and it moves
 * forward only when you advance it on purpose, one route at a time:
 *
 *   node scripts/parity-snapshot.mjs /about      # after reviewing /about
 *
 * So editing the landing page and silently changing five SEO pages' metadata
 * still fails loudly, which is the whole point of keeping this script.
 *
 * Usage:
 *   node scripts/parity-diff.mjs [distDir] [baselineDir]
 * Defaults:
 *   dist/doctoguide/browser   ../doctoguide-v2-baseline
 *
 * Exit code 1 if anything differs, so it can gate a build.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] || 'dist/doctoguide/browser';
const BASE = process.argv[3] || '../doctoguide-v2-baseline';

const ROUTES = [
  '/', '/start', '/privacy', '/terms', '/disclaimer', '/ai-doctor', '/symptom-checker',
  '/which-specialist-to-see', '/health-guide', '/emergency-numbers', '/how-it-works',
  '/find-doctors', '/pricing', '/about', '/medical-safety', '/contact', '/health-topics',
  '/health-topics/headache', '/health-topics/fever', '/health-topics/cough',
  '/health-topics/stomach-pain', '/404',
];

const pick = (h, re) => { const m = h.match(re); return m ? m[1].trim() : null; };

function extract(html) {
  const mainRaw = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/) || [, ''])[1];
  const main = mainRaw
    // Drop v1's Material-Icons spans ELEMENT AND ALL. Their ligature ("arrow_forward",
    // "chat_bubble_outline", …) was real text content in the baseline HTML, so a naive
    // text compare reports a diff on every page that has an icon. ds-icon renders an
    // <svg> with no text, which is the correct behaviour — v1 was leaking icon names
    // into its own indexable copy.
    //
    // Removing the whole element (rather than blacklisting the words) matters: many
    // ligatures are ordinary prose words here — info, history, link, translate, star,
    // send, place, schedule — and word-stripping would silently mask genuine diffs.
    .replace(/<span[^>]*class="[^"]*material-icons[^"]*"[^>]*>[\s\S]*?<\/span>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
  return {
    title: pick(html, /<title>([\s\S]*?)<\/title>/)?.replace(/&amp;/g, '&') ?? null,
    description: pick(html, /<meta name="description" content="([^"]*)"/)?.replace(/&amp;/g, '&') ?? null,
    robots: pick(html, /<meta name="robots" content="([^"]*)"/),
    canonical: pick(html, /<link rel="canonical" href="([^"]*)"/),
    ogImage: pick(html, /<meta property="og:image" content="([^"]*)"/),
    h1: (pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/) || '')
      .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim() || null,
    main,
    hasJsonLd: /application\/ld\+json/.test(html),
  };
}

const read = (dir, route) => {
  const f = join(dir, route === '/' ? '' : route, 'index.html');
  return existsSync(f) ? readFileSync(f, 'utf8') : null;
};

/**
 * Routes where the <main> text is KNOWN to differ from the baseline, with the
 * reason. Metadata is still compared strictly — only the body-text check is
 * waived.
 *
 * DELIBERATELY EMPTY. It held one entry against the v1 baseline: PrimeNG's
 * p-carousel ran in circular mode and cloned the first and last hero slides
 * into the DOM, so v1's `/` contained ~198 chars of duplicated slide copy that
 * ds-carousel does not emit. That waiver described a v1-vs-v2 difference and is
 * meaningless now that the baseline IS v2 output — worse, it would silently
 * swallow every future change to the landing page's body text.
 *
 * The right way to accept a body-text change now is to review it and advance
 * the baseline for that route:
 *
 *   node scripts/parity-snapshot.mjs /
 *
 * Only add an entry here for a difference that is genuinely UNSTABLE between
 * builds and cannot be snapshotted — and say why, so it can be re-verified.
 */
const KNOWN_TEXT_DIFFS = {};

let failures = 0;
const FIELDS = ['title', 'description', 'robots', 'canonical', 'ogImage', 'h1', 'hasJsonLd'];

for (const route of ROUTES) {
  const a = read(BASE, route);
  const b = read(DIST, route);
  if (!a) { console.log(`SKIP ${route} — not in baseline`); continue; }
  if (!b) { console.log(`FAIL ${route} — NOT PRERENDERED in dist`); failures++; continue; }

  const A = extract(a), B = extract(b);
  const diffs = [];
  for (const f of FIELDS) {
    if (A[f] !== B[f]) diffs.push(`    ${f}:\n      baseline: ${JSON.stringify(A[f])}\n      new     : ${JSON.stringify(B[f])}`);
  }
  // <main> text: report a similarity ratio rather than a raw dump.
  if (A.main !== B.main && KNOWN_TEXT_DIFFS[route]) {
    console.log(`ok*  ${route} — main text differs, known and accepted:`);
    console.log(`       ${KNOWN_TEXT_DIFFS[route]}`);
  } else if (A.main !== B.main) {
    const shorter = Math.min(A.main.length, B.main.length);
    const longer = Math.max(A.main.length, B.main.length) || 1;
    let same = 0;
    for (let i = 0; i < shorter; i++) if (A.main[i] === B.main[i]) same++; else break;
    diffs.push(
      `    main text differs: baseline ${A.main.length} chars, new ${B.main.length} chars ` +
      `(${((shorter / longer) * 100).toFixed(1)}% length match, diverges at char ${same})\n` +
      `      baseline: …${A.main.slice(Math.max(0, same - 40), same + 80)}…\n` +
      `      new     : …${B.main.slice(Math.max(0, same - 40), same + 80)}…`,
    );
  }

  if (diffs.length) { failures++; console.log(`FAIL ${route}`); console.log(diffs.join('\n')); }
  else console.log(`ok   ${route}`);
}

console.log(failures ? `\n${failures} route(s) differ` : `\nall ${ROUTES.length} routes match the baseline`);
process.exit(failures ? 1 : 0);
