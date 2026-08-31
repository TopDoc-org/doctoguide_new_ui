import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AiDoctorApiService } from './ai-doctor-api.service';
import { AiDoctorStateService } from './ai-doctor-state.service';
import { AffiliateService } from '../../../core/affiliate/affiliate.service';
import { environment } from '../../../../environments/environment';

/**
 * Endpoint contract for the patient-facing triage app (19 endpoints).
 *
 * This is the busiest surface in the product and the one whose behaviour the
 * whole migration is judged on. Two things are asserted that a type-check
 * cannot see:
 *  - which calls send the Bearer token and which are deliberately anonymous;
 *  - that affiliate attribution (clinicId / campaign / utm) is auto-attached
 *    to the session and the doctor search, since that is how partner
 *    conversions get credited.
 */
describe('AiDoctorApiService', () => {
  const AI = `${environment.serverUrl}${environment.aiBase}`;
  const USER = `${environment.serverUrl}${environment.userBase}`;

  let api: AiDoctorApiService;
  let http: HttpTestingController;
  let state: AiDoctorStateService;
  let affiliate: AffiliateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AiDoctorApiService);
    http = TestBed.inject(HttpTestingController);
    state = TestBed.inject(AiDoctorStateService);
    affiliate = TestBed.inject(AffiliateService);
  });

  afterEach(() => http.verify());

  const auth = (r: { request: { headers: { get(n: string): string | null } } }) =>
    r.request.headers.get('Authorization');

  // ---- session ------------------------------------------------------------

  it('POSTs /session anonymously when logged out, with no auth header', () => {
    spyOnProperty(state, 'authToken', 'get').and.returnValue(null);
    spyOnProperty(affiliate, 'clinicId', 'get').and.returnValue(null);
    spyOnProperty(affiliate, 'campaign', 'get').and.returnValue(null);
    spyOnProperty(affiliate, 'utm', 'get').and.returnValue(undefined);

    api.createSession().subscribe();
    const req = http.expectOne(`${AI}/session`);
    expect(req.request.method).toBe('POST');
    expect(auth(req)).toBeNull();
    req.flush({});
  });

  it('POSTs /session WITH the bearer token when logged in, so it lands in history', () => {
    spyOnProperty(state, 'authToken', 'get').and.returnValue('utok');
    api.createSession().subscribe();
    const req = http.expectOne(`${AI}/session`);
    expect(auth(req)).toBe('Bearer utok');
    req.flush({});
  });

  it('attaches affiliate clinicId/campaign/utm to a new session', () => {
    spyOnProperty(state, 'authToken', 'get').and.returnValue(null);
    spyOnProperty(affiliate, 'clinicId', 'get').and.returnValue('clinic_7');
    spyOnProperty(affiliate, 'campaign', 'get').and.returnValue('spring');
    spyOnProperty(affiliate, 'utm', 'get').and.returnValue({ utm_campaign: 'spring' });

    api.createSession().subscribe();
    const req = http.expectOne(`${AI}/session`);
    expect(req.request.body).toEqual({
      clinicId: 'clinic_7',
      campaign: 'spring',
      utm: { utm_campaign: 'spring' },
    });
    req.flush({});
  });

  it('GETs /session/:id to rehydrate, anonymously', () => {
    api.getSession('s1').subscribe();
    const req = http.expectOne(`${AI}/session/s1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  // ---- conversation -------------------------------------------------------

  it('POSTs /message with amend/overrideEmergency undefined when not set', () => {
    api.sendMessage('s1', 'my head hurts').subscribe();
    const req = http.expectOne(`${AI}/message`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      sessionId: 's1',
      text: 'my head hurts',
      amend: undefined,
      overrideEmergency: undefined,
    });
    req.flush({});
  });

  it('POSTs /message with amend:true on a post-report amendment', () => {
    api.sendMessage('s1', 'also a fever', { amend: true }).subscribe();
    const req = http.expectOne(`${AI}/message`);
    expect(req.request.body.amend).toBeTrue();
    req.flush({});
  });

  it('POSTs /message with overrideEmergency:true once the user acknowledges', () => {
    api.sendMessage('s1', 'continue', { overrideEmergency: true }).subscribe();
    const req = http.expectOne(`${AI}/message`);
    expect(req.request.body.overrideEmergency).toBeTrue();
    req.flush({});
  });

  it('POSTs /report with just the sessionId', () => {
    api.generateReport('s1').subscribe();
    const req = http.expectOne(`${AI}/report`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ sessionId: 's1' });
    req.flush({});
  });

  // ---- auth (PIN) ---------------------------------------------------------

  it('POSTs /user/numCheck with the mobile', () => {
    api.numCheck('9990001111').subscribe();
    const req = http.expectOne(`${USER}/numCheck`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ mobile: '9990001111' });
    req.flush({});
  });

  it('POSTs /user/login with mobileNumber+password (the PIN)', () => {
    api.login('9990001111', '1234').subscribe();
    const req = http.expectOne(`${USER}/login`);
    expect(req.request.body).toEqual({ mobileNumber: '9990001111', password: '1234' });
    req.flush({});
  });

  it('POSTs /user/signup and /user/setPin with the payload untouched', () => {
    const payload = { mobile: '9990001111', password: '1234', district: 'Khordha' };
    api.signup(payload).subscribe();
    http.expectOne(`${USER}/signup`).flush({});

    api.setPin(payload).subscribe();
    const req = http.expectOne(`${USER}/setPin`);
    // Pins the uncommitted v1 change that adds `district` to both signup paths.
    expect(req.request.body.district).toBe('Khordha');
    req.flush({});
  });

  it('POSTs the WhatsApp OTP send/verify and the PIN reset', () => {
    api.sendWhatsappOtp('9990001111').subscribe();
    const send = http.expectOne(`${USER}/sendWhatsappOtp`);
    expect(send.request.body).toEqual({ phoneNumber: '9990001111' });
    send.flush({});

    api.verifyWhatsappOtp({ phoneNumber: '9990001111', otp: '123456' }).subscribe();
    http.expectOne(`${USER}/verifyWhatsappOtp`).flush({});

    api.resetPinAfterOtp('9990001111', '4321').subscribe();
    const reset = http.expectOne(`${USER}/resetPinAfterOtp`);
    expect(reset.request.body).toEqual({ mobileNumber: '9990001111', newPin: '4321' });
    reset.flush({});
  });

  // ---- history, doctors, places, pdf --------------------------------------

  it('GETs /sessions with the bearer token', () => {
    spyOnProperty(state, 'authToken', 'get').and.returnValue('utok');
    api.listSessions().subscribe();
    const req = http.expectOne(`${AI}/sessions`);
    expect(auth(req)).toBe('Bearer utok');
    req.flush({ sessions: [] });
  });

  it('defaults findDoctors clinicId from the stored affiliate ref', () => {
    spyOnProperty(affiliate, 'clinicId', 'get').and.returnValue('clinic_7');
    api.findDoctors({ sessionId: 's1', specialty: 'ENT' }).subscribe();
    const req = http.expectOne(`${AI}/doctors`);
    expect(req.request.body.clinicId).toBe('clinic_7');
    req.flush({});
  });

  it('lets an explicit findDoctors clinicId win over the stored ref', () => {
    spyOnProperty(affiliate, 'clinicId', 'get').and.returnValue('clinic_7');
    api.findDoctors({ clinicId: 'explicit' }).subscribe();
    const req = http.expectOne(`${AI}/doctors`);
    expect(req.request.body.clinicId).toBe('explicit');
    req.flush({});
  });

  it('GETs /places with q, and adds cc only when a country is known', () => {
    api.searchPlaces('mumb').subscribe();
    const a = http.expectOne((r) => r.url === `${AI}/places`);
    expect(a.request.params.get('q')).toBe('mumb');
    expect(a.request.params.has('cc')).toBeFalse();
    a.flush({ places: [] });

    api.searchPlaces('mumb', 'IN').subscribe();
    const b = http.expectOne((r) => r.url === `${AI}/places`);
    expect(b.request.params.get('cc')).toBe('IN');
    b.flush({ places: [] });
  });

  it('GETs the report PDF as a BLOB with the bearer token', () => {
    spyOnProperty(state, 'authToken', 'get').and.returnValue('utok');
    api.downloadReportPdf('s1').subscribe();
    const req = http.expectOne(`${AI}/report/s1/pdf`);
    // Gated server-side: without the header this 401s.
    expect(auth(req)).toBe('Bearer utok');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
  });
});
