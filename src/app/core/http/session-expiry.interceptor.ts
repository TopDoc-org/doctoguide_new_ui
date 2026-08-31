import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { PartnerAuthService } from '../../features/partner/services/partner-auth.service';
import { AdminAuthService } from '../../features/admin/services/admin-auth.service';
import { OwnerAuthService } from '../../features/owner/services/owner-auth.service';

// Catches expired/invalid Bearer tokens on the partner & admin consoles. When a
// dashboard request returns 401 (token TTL elapsed — the guards only check
// token presence, not expiry), we clear the stale session and bounce to the
// matching login with `?expired=1`, which renders a "session timed out" banner.
// Login/signup 401s (wrong credentials) are left to the forms to message.
//
// This IS the expiry mechanism: no guard anywhere checks token expiry.
export const sessionExpiryInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const partnerAuth = inject(PartnerAuthService);
  const adminAuth = inject(AdminAuthService);
  const ownerAuth = inject(OwnerAuthService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        const url = req.url || '';
        const isAuthAttempt = /\/login\b|\/signup\b|pwdLogin/i.test(url);
        if (!isAuthAttempt) {
          if (/\/owner\//.test(url)) {
            ownerAuth.logout();
            void router.navigate(['/owner/login'], { queryParams: { expired: 1 } });
          } else if (/\/partner\//.test(url)) {
            partnerAuth.logout();
            void router.navigate(['/partner/login'], { queryParams: { expired: 1 } });
          } else if (/\/admin\//.test(url)) {
            adminAuth.logout();
            void router.navigate(['/admin/login'], { queryParams: { expired: 1 } });
          }
        }
      }
      return throwError(() => err);
    }),
  );
};
