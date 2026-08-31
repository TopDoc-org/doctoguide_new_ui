import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { sessionExpiryInterceptor } from './session-expiry.interceptor';
import { PartnerAuthService } from '../../features/partner/services/partner-auth.service';
import { AdminAuthService } from '../../features/admin/services/admin-auth.service';
import { OwnerAuthService } from '../../features/owner/services/owner-auth.service';

/**
 * This interceptor IS the token-expiry mechanism: the three console guards only
 * check that a token is present, never that it is still valid. If this stops
 * firing, an expired session silently shows empty dashboards instead of
 * bouncing to a login — so its URL-sniffing rules are worth pinning down.
 */
describe('sessionExpiryInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let partner: PartnerAuthService;
  let admin: AdminAuthService;
  let owner: OwnerAuthService;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessionExpiryInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    partner = TestBed.inject(PartnerAuthService);
    admin = TestBed.inject(AdminAuthService);
    owner = TestBed.inject(OwnerAuthService);
    spyOn(partner, 'logout');
    spyOn(admin, 'logout');
    spyOn(owner, 'logout');
  });

  afterEach(() => ctrl.verify());

  const fire401 = (url: string) => {
    http.get(url).subscribe({ next: () => {}, error: () => {} });
    ctrl.expectOne(url).flush(null, { status: 401, statusText: 'Unauthorized' });
  };

  it('logs the owner out and bounces to /owner/login?expired=1', () => {
    fire401('https://api.test/owner/summary');
    expect(owner.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/owner/login'], { queryParams: { expired: 1 } });
  });

  it('logs the partner out and bounces to /partner/login?expired=1', () => {
    fire401('https://api.test/partner/leads');
    expect(partner.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/partner/login'], { queryParams: { expired: 1 } });
  });

  it('logs the admin out and bounces to /admin/login?expired=1', () => {
    fire401('https://api.test/admin/overview');
    expect(admin.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/login'], { queryParams: { expired: 1 } });
  });

  // A 401 from a login form means "wrong credentials" and must be left to the
  // form to message. Bouncing here would wipe the error the user needs to see.
  for (const url of [
    'https://api.test/partner/login',
    'https://api.test/admin/login',
    'https://api.test/owner/login',
    'https://api.test/partner/signup',
    'https://api.test/user/staff/pwdLogin',
  ]) {
    it(`leaves a 401 from ${url.split('/').slice(3).join('/')} alone`, () => {
      fire401(url);
      expect(router.navigate).not.toHaveBeenCalled();
      expect(partner.logout).not.toHaveBeenCalled();
      expect(admin.logout).not.toHaveBeenCalled();
      expect(owner.logout).not.toHaveBeenCalled();
    });
  }

  it('ignores a 401 from a realm it does not recognise', () => {
    fire401('https://api.test/ai-doctor/report');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ignores non-401 failures', () => {
    http.get('https://api.test/admin/leads').subscribe({ next: () => {}, error: () => {} });
    ctrl.expectOne('https://api.test/admin/leads')
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(router.navigate).not.toHaveBeenCalled();
    expect(admin.logout).not.toHaveBeenCalled();
  });

  it('re-throws so the caller still sees the error', () => {
    let seen: unknown = null;
    http.get('https://api.test/admin/overview').subscribe({ next: () => {}, error: (e) => (seen = e) });
    ctrl.expectOne('https://api.test/admin/overview')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(seen).toBeTruthy();
  });
});
