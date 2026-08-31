import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PartnerAuthService } from '../services/partner-auth.service';

// Blocks the console until a partner is logged in.
//
// Presence-only check, exactly as v1: token EXPIRY is handled by
// sessionExpiryInterceptor, which bounces a 401 to /partner/login?expired=1.
export const partnerAuthGuard: CanActivateFn = () => {
  const auth = inject(PartnerAuthService);
  const router = inject(Router);
  return auth.isLoggedIn ? true : router.createUrlTree(['/partner/login']);
};
