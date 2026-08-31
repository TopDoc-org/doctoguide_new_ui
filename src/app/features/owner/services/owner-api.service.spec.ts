import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OwnerApiService } from './owner-api.service';
import { OwnerAuthService } from './owner-auth.service';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { OwnerQuery } from '../models';

// Heterogeneous Observable<T> in one table needs a common call signature.
type Call = (a: OwnerApiService) => Observable<unknown>;

/**
 * Endpoint contract for the creator/owner console (10 endpoints).
 * Four of them are CSV blobs — a wrong responseType compiles fine and only
 * fails when a real export runs, so each is asserted explicitly.
 */
describe('OwnerApiService', () => {
  const BASE = `${environment.serverUrl}${environment.ownerBase}`;
  const Q: OwnerQuery = { from: '2026-01-01', to: '2026-01-31' };

  let api: OwnerApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(OwnerApiService);
    http = TestBed.inject(HttpTestingController);
    spyOnProperty(TestBed.inject(OwnerAuthService), 'token', 'get').and.returnValue('own1');
  });

  afterEach(() => http.verify());

  const auth = (r: { request: { headers: { get(n: string): string | null } } }) =>
    r.request.headers.get('Authorization');

  it('POSTs /login with username+password', () => {
    api.login('creator', 'pw').subscribe();
    const req = http.expectOne(`${BASE}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'creator', password: 'pw' });
    req.flush({});
  });

  for (const [name, call] of [
    ['/me', (a) => a.me()],
    ['/filters', (a) => a.filters()],
  ] as [string, Call][]) {
    it(`GETs ${name} with the bearer token`, () => {
      call(api).subscribe();
      const req = http.expectOne(`${BASE}${name}`);
      expect(req.request.method).toBe('GET');
      expect(auth(req)).toBe('Bearer own1');
      req.flush({});
    });
  }

  for (const [path, call] of [
    ['summary', (a) => a.summary(Q)],
    ['campaigns', (a) => a.campaigns(Q)],
    ['clinics', (a) => a.clinics(Q)],
    ['leads', (a) => a.leads(Q)],
  ] as [string, Call][]) {
    it(`GETs /${path} with from+to and the bearer token`, () => {
      call(api).subscribe();
      const req = http.expectOne((r) => r.url === `${BASE}/${path}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('from')).toBe('2026-01-01');
      expect(req.request.params.get('to')).toBe('2026-01-31');
      expect(auth(req)).toBe('Bearer own1');
      req.flush({});
    });
  }

  for (const [path, call] of [
    ['campaigns/export', (a) => a.exportCampaigns(Q)],
    ['clinics/export', (a) => a.exportClinics(Q)],
    ['leads/export', (a) => a.exportLeads(Q)],
  ] as [string, Call][]) {
    it(`GETs /${path} as a BLOB`, () => {
      call(api).subscribe();
      const req = http.expectOne((r) => r.url === `${BASE}/${path}`);
      expect(req.request.responseType).toBe('blob');
      expect(auth(req)).toBe('Bearer own1');
      req.flush(new Blob());
    });
  }

  it('sends a page param on /leads only when asked', () => {
    api.leads({ ...Q, page: 2 }).subscribe();
    const req = http.expectOne((r) => r.url === `${BASE}/leads`);
    expect(req.request.params.get('page')).toBe('2');
    req.flush({});
  });
});
