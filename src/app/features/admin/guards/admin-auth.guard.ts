import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

// Blocks the console until a admin is logged in.
//
// Presence-only check, exactly as v1: token EXPIRY is handled by
// sessionExpiryInterceptor, which bounces a 401 to /admin/login?expired=1.
export const adminAuthGuard: CanActivateFn = () => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  return auth.isLoggedIn ? true : router.createUrlTree(['/admin/login']);
};
