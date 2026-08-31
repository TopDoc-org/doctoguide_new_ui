import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PartnerApiService } from './partner-api.service';
import { PartnerAuthService } from './partner-auth.service';
import { environment } from '../../../../environments/environment';
import { PartnerLeadQuery, PartnerOfferRecord } from '../models';

/**
 * Endpoint contract for the clinic-admin console (10 endpoints).
 *
 * Two things here are easy to break in a port and are asserted explicitly:
 *  - login has TWO paths, and the staff one hits a DIFFERENT base
 *    (`/user/staff/pwdLogin`, not `/partner/...`);
 *  - updateOffer is a PUT to /offers/:id, while createOffer is a POST to
 *    /offers — swapping them would still type-check.
 */
describe('PartnerApiService', () => {
  const BASE = `${environment.serverUrl}${environment.partnerBase}`;
  const USER = `${environment.serverUrl}${environment.userBase}`;
  const Q: PartnerLeadQuery = { from: '2026-01-01', to: '2026-01-31' };

  let api: PartnerApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PartnerApiService);
    http = TestBed.inject(HttpTestingController);
    spyOnProperty(TestBed.inject(PartnerAuthService), 'token', 'get').and.returnValue('ptk');
  });

  afterEach(() => http.verify());

  const auth = (r: { request: { headers: { get(n: string): string | null } } }) =>
    r.request.headers.get('Authorization');

  it('POSTs the clinic login to /partner/login with {mobile, pin}', () => {
    api.login('9990001111', '1234').subscribe();
    const req = http.expectOne(`${BASE}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ mobile: '9990001111', pin: '1234' });
    req.flush({});
  });

  it('POSTs the STAFF login to /user/staff/pwdLogin — a different base', () => {
    api.pwdLogin('9990001111', 'secret').subscribe();
    const req = http.expectOne(`${USER}/staff/pwdLogin`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ mobile: '9990001111', password: 'secret' });
    req.flush({});
  });

  it('POSTs /signup with the payload untouched', () => {
    const payload = { clinicName: 'X', mobile: '9', pin: '1', city: 'Y' } as never;
    api.signup(payload).subscribe();
    const req = http.expectOne(`${BASE}/signup`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('GETs /me with the bearer token', () => {
    api.me().subscribe();
    const req = http.expectOne(`${BASE}/me`);
    expect(auth(req)).toBe('Bearer ptk');
    req.flush({});
  });

  it('GETs /metrics with from+to, and omits campaign when absent', () => {
    api.metrics('2026-01-01', '2026-01-31').subscribe();
    const req = http.expectOne((r) => r.url === `${BASE}/metrics`);
    expect(req.request.params.get('from')).toBe('2026-01-01');
    expect(req.request.params.has('campaign')).toBeFalse();
    req.flush({});
  });

  it('GETs /metrics WITH campaign when supplied', () => {
    api.metrics('2026-01-01', '2026-01-31', 'spring').subscribe();
    const req = http.expectOne((r) => r.url === `${BASE}/metrics`);
    expect(req.request.params.get('campaign')).toBe('spring');
    req.flush({});
  });

  it('GETs /leads WITH page, and /leads/export WITHOUT page', () => {
    api.leads({ ...Q, page: 4 }).subscribe();
    const leads = http.expectOne((r) => r.url === `${BASE}/leads`);
    expect(leads.request.params.get('page')).toBe('4');
    leads.flush({});

    api.exportLeads({ ...Q, page: 4 }).subscribe();
    const exp = http.expectOne((r) => r.url === `${BASE}/leads/export`);
    // export deliberately returns the whole filtered set, not one page
    expect(exp.request.params.has('page')).toBeFalse();
    expect(exp.request.responseType).toBe('blob');
    exp.flush(new Blob());
  });

  it('GETs /offers with the bearer token', () => {
    api.listOffers().subscribe();
    const req = http.expectOne(`${BASE}/offers`);
    expect(req.request.method).toBe('GET');
    expect(auth(req)).toBe('Bearer ptk');
    req.flush({ offers: [] });
  });

  it('POSTs a new offer to /offers', () => {
    const offer = { id: '', title: 'Free check' } as unknown as PartnerOfferRecord;
    api.createOffer(offer).subscribe();
    const req = http.expectOne(`${BASE}/offers`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(offer);
    req.flush({});
  });

  it('PUTs an edited offer to /offers/:id', () => {
    const offer = { id: 'off_9', title: 'Updated' } as unknown as PartnerOfferRecord;
    api.updateOffer(offer).subscribe();
    const req = http.expectOne(`${BASE}/offers/off_9`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(offer);
    expect(auth(req)).toBe('Bearer ptk');
    req.flush({});
  });
});
