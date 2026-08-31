import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OwnerAuthService } from '../services/owner-auth.service';

// Blocks the console until a owner is logged in.
//
// Presence-only check, exactly as v1: token EXPIRY is handled by
// sessionExpiryInterceptor, which bounces a 401 to /owner/login?expired=1.
export const ownerAuthGuard: CanActivateFn = () => {
  const auth = inject(OwnerAuthService);
  const router = inject(Router);
  return auth.isLoggedIn ? true : router.createUrlTree(['/owner/login']);
};
