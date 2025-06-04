// src/app/auth/proprietaire.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// >>> VÉRIFIE BIEN CETTE LIGNE <<<
export const proprietaireGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.isCurrentUserProprietaire()) {
    // console.log("ProprietaireGuard: Accès autorisé."); // Commentaire optionnel
    return true;
  } else {
    if (!authService.isLoggedIn()) {
         // console.warn("ProprietaireGuard: Non connecté. Redirection vers /login."); // Commentaire optionnel
         router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    } else {
        // console.warn("ProprietaireGuard: Utilisateur n'est pas propriétaire. Redirection vers /annonces."); // Commentaire optionnel
         router.navigate(['/annonces']); // Redirige l'étudiant vers sa page
    }
    return false;
  }
};