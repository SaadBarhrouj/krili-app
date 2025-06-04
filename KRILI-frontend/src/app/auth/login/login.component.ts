// ===============================================================
// FICHIER COMPLET : src/app/auth/login/login.component.ts (CORRIG?? POUR NE PLUS APPELER saveToken)
// ===============================================================
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router'; // RouterLink pour les liens HTML, Router pour la navigation TS
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; // Pour *ngIf etc.
import { AuthService } from '../auth.service'; // Importer le service d'authentification mis ?? jour

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, // N??cessaire pour formGroup
    CommonModule,      // N??cessaire pour *ngIf
    RouterLink         // N??cessaire pour les liens routerLink dans le HTML
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup; // Le groupe de formulaire r??actif
  errorMessage: string | null = null; // Pour afficher les messages d'erreur
  successMessage: string | null = null; // Pour afficher les messages de succ??s (si applicable)
  isLoading = false; // Pour afficher un indicateur de chargement pendant l'appel API
  passwordFieldType: string = 'password'; // Pour basculer la visibilit?? du mot de passe

  constructor(
    private fb: FormBuilder,        // Service pour cr??er des formulaires r??actifs
    private authService: AuthService, // Service d'authentification (version mise ?? jour)
    private router: Router          // Service pour la navigation programmatique
  ) {
    // Initialisation du formulaire avec les contr??les et validateurs
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]], // Champ email requis et doit ??tre un format email valide
      password: ['', Validators.required]                   // Champ mot de passe requis
    });
  }

  /**
   * Bascule la visibilit?? du champ mot de passe entre 'password' et 'text'.
   */
  togglePasswordVisibility(): void {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  /**
   * M??thode appel??e lors de la soumission du formulaire.
   */
  onSubmit(): void {
    // V??rifier si le formulaire est valide selon les validateurs d??finis
    if (this.loginForm.invalid) {
      // Marquer tous les contr??les comme "touch??s" pour afficher les messages d'erreur imm??diatement
      Object.values(this.loginForm.controls).forEach(control => control.markAsTouched());
      this.errorMessage = "Veuillez remplir correctement tous les champs.";
      this.successMessage = null; // S'assurer qu'il n'y a pas de message de succ??s affich??
      return; // Arr??ter le processus si le formulaire est invalide
    }

    // R??initialiser les messages et activer l'indicateur de chargement
    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = true;

    // Appeler la m??thode login du service d'authentification
    this.authService.login(this.loginForm.value).subscribe({
      /**
       * Callback ex??cut?? si l'appel API r??ussit (statut 2xx).
       * La r??ponse du backend (contenant le token) est pass??e en argument.
       * La sauvegarde du token et la mise ?? jour de l'??tat utilisateur sont g??r??es
       * DANS la m??thode authService.login() elle-m??me (gr??ce ?? l'op??rateur `tap`).
       */
      next: (response) => {
        this.isLoading = false; // D??sactiver l'indicateur de chargement
        console.log("LoginComponent: Connexion r??ussie, r??ponse:", response);

        // ---> LIGNE SUPPRIM??E : this.authService.saveToken(response.token); <---
        // La sauvegarde et MAJ de l'??tat est d??j?? faite dans le service.

        // V??rifier le r??le (maintenant ?? jour dans AuthService) et rediriger
        if (this.authService.isCurrentUserProprietaire()) {
          console.log("LoginComponent: Redirection vers /proprietaire/dashboard");
          this.router.navigate(['/proprietaire/dashboard']); // Redirige vers le dashboard propri??taire
        } else {
          console.log("LoginComponent: Redirection vers /annonces");
          this.router.navigate(['/annonces']); // Redirige vers la page d'accueil ??tudiant
        }
      },
      /**
       * Callback ex??cut?? si l'appel API ??choue (statut non 2xx).
       * L'erreur (HttpErrorResponse) est pass??e en argument.
       * L'??tat utilisateur est normalement d??j?? r??initialis?? ?? null par le catchError dans AuthService.
       */
      error: (error: Error) => { // Utiliser le type Error qui est retourn?? par throwError(() => new Error(...))
        this.isLoading = false; // D??sactiver l'indicateur de chargement
        console.error('LoginComponent: Erreur de connexion re??ue:', error);

        // Afficher le message d'erreur pr??par?? par le handleError de AuthService
        this.errorMessage = error.message || "Une erreur inconnue est survenue lors de la connexion.";
      }
    });
  }

  // Getters pour faciliter l'acc??s aux contr??les dans le template HTML
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}