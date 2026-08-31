import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminApiService } from './admin-api.service';
import { AdminAuthService } from './admin-auth.service';
import { environment } from '../../../../environments/environment';
import { AdminLeadQuery } from '../models';

/**
 * Endpoint contract for the super-admin console (6 endpoints).
 *
 * These exist because the migration's core promise is "same API calls". There
 * is no auth interceptor — every service hand-builds its own Authorization
 * header — so each endpoint is an independent chance to drop it. That is
 * exactly the class of regression a port introduces and a type-check misses.
 */
describe('AdminApiService', () => {
  const BASE = `${environment.serverUrl}${environment.adminBase}`;
  const Q: AdminLeadQuery = { from: '2026-01-01', to: '2026-01-31' };

  let api: AdminApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AdminApiService);
    http = TestBed.inject(HttpTestingController);
    spyOnProperty(TestBed.inject(AdminAuthService), 'token', 'get').and.returnValue('tok123');
  });

  afterEach(() => http.verify());

  const bearer = (r: { request: { headers: { get(n: string): string | null } } }) =>
    r.request.headers.get('Authorization');

  it('POSTs /login with username+password and NO auth header', () => {
    api.login('root', 'pw').subscribe();
    const req = http.expectOne(`${BASE}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'root', password: 'pw' });
    expect(bearer(req)).toBeNull();
    req.flush({});
  });

  it('GETs /me with the bearer token', () => {
    api.me().subscribe();
    const req = http.expectOne(`${BASE}/me`);
    expect(req.request.method).toBe('GET');
    expect(bearer(req)).toBe('Bearer tok123');
    req.flush({});
  });

  it('GETs /filters with the bearer token', () => {
    api.filters().subscribe();
    const req = http.expectOne(`${BASE}/filters`);
    expect(req.request.method).toBe('GET');
    expect(bearer(req)).toBe('Bearer tok123');
    req.flush({});
  });

  it('GETs /overview with from+to params', () => {
    api.overview(Q).subscribe();
    const req = http.expectOne((r) => r.url === `${BASE}/overview`);
    expect(req.request.params.get('from')).toBe('2026-01-01');
    expect(req.request.params.get('to')).toBe('2026-01-31');
    expect(bearer(req)).toBe('Bearer tok123');
    req.flush({});
  });

  it('GETs /leads WITH a page param (overview does not send one)', () => {
    api.leads({ ...Q, page: 3 }).subscribe();
    const req = http.expectOne((r) => r.url === `${BASE}/leads`);
    expect(req.request.params.get('page')).toBe('3');
    req.flush({});
  });

  it('drops empty optional filters rather than sending blanks', () => {
    api.leads({ ...Q, clinicId: '', state: 'OD', q: undefined as unknown as string }).subscribe();
    const req = http.expectOne((r) => r.url === `${BASE}/leads`);
    expect(req.request.params.has('clinicId')).toBeFalse();
    expect(req.request.params.get('state')).toBe('OD');
    expect(req.request.params.has('q')).toBeFalse();
    req.flush({});
  });

  it('GETs /leads/export as a BLOB', () => {
    api.exportLeads(Q).subscribe();
    const req = http.expectOne((r) => r.url === `${BASE}/leads/export`);
    // A wrong responseType only fails at runtime, when the CSV arrives as text.
    expect(req.request.responseType).toBe('blob');
    expect(bearer(req)).toBe('Bearer tok123');
    req.flush(new Blob());
  });
});
