// src/app/auth/etudiant.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const etudiantGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && !authService.isCurrentUserProprietaire()) {
    return true; // Autorisé
  } else {
    // Rediriger vers login si pas connecté, sinon vers dashboard proprio
    const targetRoute = authService.isLoggedIn() ? '/proprietaire/dashboard' : '/login';
    router.navigate([targetRoute], { queryParams: { returnUrl: state.url }});
    return false; // Bloqué
  }
};