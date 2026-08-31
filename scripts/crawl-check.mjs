// Quick liveness crawl of every public route against a running dev server.
const BASE = process.argv[2] || 'http://localhost:4701';
const ROUTES = ['/','/start','/privacy','/terms','/disclaimer','/ai-doctor','/symptom-checker',
'/which-specialist-to-see','/health-guide','/emergency-numbers','/how-it-works','/find-doctors',
'/pricing','/about','/medical-safety','/contact','/health-topics','/health-topics/headache',
'/health-topics/fever','/health-topics/cough','/health-topics/stomach-pain','/404'];
let bad = 0;
for (const r of ROUTES) {
  const res = await fetch(BASE + r);
  const ok = res.status === 200;
  if (!ok) { bad++; console.log(`FAIL ${res.status} ${r}`); }
}
console.log(bad === 0 ? `all ${ROUTES.length} routes served 200` : `${bad} route(s) failed`);
