/**
 * Behavioural parity, v1 -> v2, for the surface `parity-diff.mjs` CANNOT see.
 *
 * That script compares prerendered HTML, so it covers the 22 public routes and
 * nothing else. /triage and the three console realms are noindex and never
 * prerendered, which means the majority of the app's actual behaviour crossed
 * the migration with no automated check at all.
 *
 * This compares the things a port drops silently: HTTP endpoints, analytics
 * event names, route paths, and localStorage keys. A renamed storage key is the
 * nastiest of the four — it logs every existing web user out on deploy without
 * erroring anywhere.
 *
 * Usage:
 *   node scripts/parity-behaviour.mjs [v1Dir] [v2Dir]
 * Defaults:
 *   ../AIDoctorFront   .
 *
 * Exit code 1 if anything present in v1 is missing from v2. Additions are
 * reported but do not fail: v2 legitimately adds things (theme key, ds-*).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const V1 = process.argv[2] || '../AIDoctorFront';
const V2 = process.argv[3] || '.';

function files(root) {
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(d)) {
      if (e === 'node_modules' || e === 'dist' || e === '.angular' || e === '.git') continue;
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|html)$/.test(p) && !/\.spec\.ts$/.test(p)) out.push(p);
    }
  })(join(root, 'src'));
  return out;
}

function collect(root) {
  const endpoints = new Set();
  const analytics = new Set();
  const routes = new Set();
  const storage = new Set();
  for (const f of files(root)) {
    const s = readFileSync(f, 'utf8');
    // http calls: this.http.get<...>(`${...}/path`) — capture the literal tail
    for (const m of s.matchAll(/\.(get|post|put|patch|delete)<[^>]*>\(\s*`([^`]+)`/g)) {
      endpoints.add(m[1].toUpperCase() + ' ' + m[2].replace(/\$\{[^}]*\}/g, '{}'));
    }
    for (const m of s.matchAll(/\.(get|post|put|patch|delete)\(\s*`([^`]+)`/g)) {
      endpoints.add(m[1].toUpperCase() + ' ' + m[2].replace(/\$\{[^}]*\}/g, '{}'));
    }
    for (const m of s.matchAll(/logAnalyticsEvent\(\s*'([^']+)'/g)) analytics.add(m[1]);
    for (const m of s.matchAll(/logEvent\(\s*[^,]+,\s*'([^']+)'/g)) analytics.add(m[1]);
    for (const m of s.matchAll(/\bpath:\s*'([^']*)'/g)) routes.add(m[1]);
    // Storage keys are almost never written inline: both repos hoist them to
    // `const LS_SESSION = 'aiDoctorSessionId'` and pass the CONSTANT to the
    // call, so scanning call sites alone finds a handful and misses the rest.
    // Collect the constants themselves, plus any literal used inline.
    for (const m of s.matchAll(/const\s+(?:LS_\w+|\w*_?KEY\w*)\s*=\s*'([^']+)'/g)) storage.add(m[1]);
    for (const m of s.matchAll(/localStorage\.(?:get|set|remove)Item\(\s*'([^']+)'/g)) storage.add(m[1]);
    for (const m of s.matchAll(/\bstorage\.(?:get|set|remove)\(\s*'([^']+)'/g)) storage.add(m[1]);
  }
  return { endpoints, analytics, routes, storage };
}

const a = collect(V1);
const b = collect(V2);

let failures = 0;

function diff(name, s1, s2) {
  const missing = [...s1].filter((x) => !s2.has(x)).sort();
  failures += missing.length;
  const added = [...s2].filter((x) => !s1.has(x)).sort();
  console.log('\n### ' + name + '  (v1: ' + s1.size + ', v2: ' + s2.size + ')');
  if (!missing.length && !added.length) { console.log('  identical'); return; }
  if (missing.length) { console.log('  DROPPED in v2 (' + missing.length + '):'); missing.forEach((x) => console.log('    - ' + x)); }
  if (added.length) { console.log('  NEW in v2 (' + added.length + '):'); added.forEach((x) => console.log('    + ' + x)); }
}

diff('HTTP endpoints', a.endpoints, b.endpoints);
diff('Analytics events', a.analytics, b.analytics);
diff('Route paths', a.routes, b.routes);
diff('Storage keys', a.storage, b.storage);

if (failures) {
  console.log('\n' + failures + ' item(s) present in v1 are missing from v2.');
  process.exit(1);
}
console.log('\nno v1 behaviour dropped.');
