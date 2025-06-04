// src/app/auth/public.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const publicGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    // Si connecté, rediriger vers la page appropriée
    if (authService.isCurrentUserProprietaire()) {
      router.navigate(['/proprietaire/dashboard']);
    } else {
      router.navigate(['/annonces']); // Nouvelle route étudiant
    }
    return false; // Bloquer l'accès à la page publique (login/register)
  } else {
    return true; // Autoriser l'accès si non connecté
  }
};