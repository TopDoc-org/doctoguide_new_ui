/**
 * Snapshot prerendered routes from dist into the parity baseline.
 *
 * The v1 baseline (../doctoguide-baseline) is retired: the 2.0 redesign is
 * free to change copy and structure, so diffing against the Angular 14 app no
 * longer means anything. What still has value is catching UNINTENDED drift —
 * a route whose <title>, meta block or body text moved while you were editing
 * a different one.
 *
 * So the baseline becomes a moving target that you advance DELIBERATELY:
 *
 *   node scripts/parity-snapshot.mjs                 # re-baseline every route
 *   node scripts/parity-snapshot.mjs / /about        # re-baseline just these
 *
 * Run it only after you have reviewed the new output for those routes. Every
 * other route keeps failing `npm run parity` until you mean to change it.
 *
 * Only index.html per route is copied — parity-diff.mjs reads nothing else.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const DIST = 'dist/doctoguide/browser';
const BASE = '../doctoguide-v2-baseline';

const ALL = [
  '/', '/start', '/privacy', '/terms', '/disclaimer', '/ai-doctor', '/symptom-checker',
  '/which-specialist-to-see', '/health-guide', '/emergency-numbers', '/how-it-works',
  '/find-doctors', '/pricing', '/about', '/medical-safety', '/contact', '/health-topics',
  '/health-topics/headache', '/health-topics/fever', '/health-topics/cough',
  '/health-topics/stomach-pain', '/404',
];

const requested = process.argv.slice(2);
const routes = requested.length ? requested : ALL;

const unknown = routes.filter((r) => !ALL.includes(r));
if (unknown.length) {
  console.error(`Unknown route(s): ${unknown.join(', ')}`);
  console.error(`Known routes:\n  ${ALL.join('\n  ')}`);
  process.exit(1);
}

let copied = 0;
for (const route of routes) {
  const src = join(DIST, route === '/' ? '' : route, 'index.html');
  const dst = join(BASE, route === '/' ? '' : route, 'index.html');
  if (!existsSync(src)) {
    console.error(`MISSING ${route} — not prerendered in ${DIST}. Run npm run build first.`);
    process.exit(1);
  }
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, readFileSync(src));
  console.log(`snapshot ${route}`);
  copied++;
}

console.log(`\n${copied} route(s) written to ${BASE}`);
