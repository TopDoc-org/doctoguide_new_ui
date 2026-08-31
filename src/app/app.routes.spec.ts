import { Routes } from '@angular/router';
import { routes } from './app.routes';

/**
 * Freezes the public route surface.
 *
 * The migration's contract is "same pages, same URLs". A dropped or renamed
 * route is the one regression that silently costs indexed traffic, and nothing
 * else in the build catches it: a missing route just falls through to the
 * wildcard and renders a 404 that still returns HTTP 200.
 */
describe('app.routes', () => {
  const paths = routes.map((r) => r.path);

  it('exposes exactly the v1 top-level paths, in order', () => {
    expect(paths).toEqual([
      '',
      'start',
      'privacy',
      'terms',
      'disclaimer',
      'ai-doctor',
      'symptom-checker',
      'which-specialist-to-see',
      'health-guide',
      'emergency-numbers',
      'how-it-works',
      'find-doctors',
      'pricing',
      'about',
      'medical-safety',
      'contact',
      'health-topics',
      // generated from HEALTH_TOPICS
      'health-topics/headache',
      'health-topics/fever',
      'health-topics/cough',
      'health-topics/stomach-pain',
      // realms (all noindex, all nested lazy children)
      'triage',
      'partner',
      'admin',
      'owner',
      '404',
      '**',
    ]);
  });

  it('generates one route per health topic', () => {
    const topics = paths.filter((p) => p?.startsWith('health-topics/'));
    expect(topics.length).toBe(4);
  });

  it('keeps every private surface out of the index', () => {
    for (const p of ['start', 'triage', 'partner', 'admin', 'owner', '404', '**']) {
      const r = routes.find((x) => x.path === p);
      const seo = r?.data?.['seo'] as { robots?: string } | undefined;
      expect(seo?.robots)
        .withContext(`route "${p}" must be noindex`)
        .toContain('noindex');
    }
  });

  it('gives every indexable route a title and a description', () => {
    const privatePaths = new Set(['start', 'triage', 'partner', 'admin', 'owner', '404', '**']);
    for (const r of routes) {
      if (privatePaths.has(r.path ?? '')) continue;
      const seo = r.data?.['seo'] as { title?: string; description?: string } | undefined;
      expect(seo?.title).withContext(`route "${r.path}" needs a title`).toBeTruthy();
      expect(seo?.description).withContext(`route "${r.path}" needs a description`).toBeTruthy();
    }
  });

  it('mounts the console realms as NESTED lazy children, not flat components', () => {
    // Flattening these would break AppComponent.collectSeo()'s route.firstChild
    // walk and silently drop the parent's noindex from every child page.
    for (const p of ['triage', 'partner', 'admin', 'owner']) {
      const r = routes.find((x) => x.path === p) as Routes[number];
      expect(r.loadChildren).withContext(`"${p}" must use loadChildren`).toBeDefined();
      expect(r.component).toBeUndefined();
      expect(r.data?.['seo']).withContext(`"${p}" parent must carry data.seo`).toBeDefined();
    }
  });

  it('serves a real 404 component rather than redirecting to home', () => {
    // v1 deliberately replaced `redirectTo: ''` here: redirecting every unknown
    // URL to the homepage returned 200 with duplicate content — a soft 404.
    const wildcard = routes.find((r) => r.path === '**');
    expect(wildcard?.redirectTo).toBeUndefined();
    expect(wildcard?.loadComponent).toBeDefined();
  });
});
