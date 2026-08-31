/**
 * Fails the build when prerender-routes.txt drifts from the router.
 *
 * v1 kept its 22-route prerender list hand-duplicated inside angular.json,
 * against a separate app-routing.module.ts. Nothing checked the two agreed, so
 * adding a health topic silently shipped a page that was never prerendered —
 * it existed for users and was invisible to crawlers, with no error anywhere.
 *
 * This derives the expected set from app.routes.ts and diffs it both ways.
 *
 * Usage: node scripts/check-prerender-list.mjs
 */
import { readFileSync } from 'node:fs';

const routesSrc = readFileSync('src/app/app.routes.ts', 'utf8');
const topicsSrc = readFileSync('src/app/features/seo-pages/health-topics.data.ts', 'utf8');
const listed = readFileSync('prerender-routes.txt', 'utf8')
  .split('\n').map((l) => l.trim()).filter(Boolean);

// Split on top-level route blocks and read each block's own path, rather than
// zipping two independent regex results — those misalign the moment a block
// contains a nested `path:` (children, redirects) and silently drop a route.
const blocks = routesSrc.split(/^\s{2}\{\s*$/m).slice(1);
const expected = [];
for (const raw of blocks) {
  // Strip comments first. A block runs to the next top-level `{`, so it picks up
  // any comment that precedes the following route — and a comment mentioning
  // "loadChildren" would otherwise misclassify this route as a lazy realm.
  const b = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const m = b.match(/path: '([^']*)'/);       // first path in the block is its own
  if (!m) continue;
  const p = m[1];
  if (p === '**') continue;                    // wildcard has no URL
  if (/loadChildren/.test(b)) continue;        // console realms: noindex
  if (/robots:\s*'noindex,nofollow'/.test(b)) continue;
  expected.push('/' + p);
}

// health-topics/<slug> routes are generated from HEALTH_TOPICS, not literal.
const slugs = [...topicsSrc.matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1]);
for (const s of slugs) expected.push(`/health-topics/${s}`);

const norm = (a) => [...new Set(a)].sort();
const E = norm(expected);
const L = norm(listed);

const missing = E.filter((r) => !L.includes(r));   // in router, never prerendered
const extra = L.filter((r) => !E.includes(r));     // prerendered, not a public route

// /start is noindex but IS deliberately prerendered (it is the Google Ads
// landing page; postbuild-seo keeps it out of sitemap.xml instead).
const EXPECTED_EXTRA = new Set(['/start', '/404']);
const unexplained = extra.filter((r) => !EXPECTED_EXTRA.has(r));

console.log(`router: ${E.length} indexable route(s); prerender-routes.txt: ${L.length}`);
if (missing.length) console.log('MISSING from prerender-routes.txt:\n  ' + missing.join('\n  '));
if (unexplained.length) console.log('EXTRA in prerender-routes.txt (not a public route):\n  ' + unexplained.join('\n  '));

if (missing.length || unexplained.length) {
  console.log('\nprerender list has drifted from the router');
  process.exit(1);
}
console.log(`ok — prerender list matches the router (plus ${[...EXPECTED_EXTRA].join(', ')} by design)`);
