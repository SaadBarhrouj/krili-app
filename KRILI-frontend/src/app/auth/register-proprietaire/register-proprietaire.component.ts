import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service'; // Assurez-vous que le chemin est correct
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

// --- Validateur Personnalisé pour la Confirmation du Mot de Passe ---
export function passwordMatchValidator(): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const passwordControl = formGroup.get('password');
    const confirmPasswordControl = formGroup.get('confirmPassword');

    // Si les contrôles n'existent pas, ou si la confirmation n'a pas encore été touchée, ne rien faire
    if (!passwordControl || !confirmPasswordControl || !confirmPasswordControl.dirty) {
      return null;
    }

    // Si les mots de passe ne correspondent pas, retourner une erreur sur le FormGroup
    if (passwordControl.value !== confirmPasswordControl.value) {
      // Mettre l'erreur aussi sur le contrôle de confirmation pour l'affichage
      confirmPasswordControl.setErrors({ ...confirmPasswordControl.errors, 'passwordMismatch': true });
      return { 'passwordMismatch': true };
    } else {
      // Si ça correspond, s'assurer de retirer l'erreur potentielle du contrôle de confirmation
      const errors = { ...confirmPasswordControl.errors };
      delete errors['passwordMismatch'];
      confirmPasswordControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      return null; // Pas d'erreur sur le FormGroup
    }
  };
}
// --- Fin Validateur ---

@Component({
  selector: 'app-register-proprietaire',
  standalone: true,
  imports: [
    ReactiveFormsModule, // Indispensable pour [formGroup] etc.
    CommonModule,      // Indispensable pour *ngIf, *ngFor, [ngClass] etc.
    RouterLink         // Indispensable pour routerLink
  ],
  templateUrl: './register-proprietaire.component.html',
  styleUrls: ['./register-proprietaire.component.css'] // Assurez-vous que le chemin est correct
})
export class RegisterProprietaireComponent implements OnInit, OnDestroy {

  // --- Propriétés du formulaire et de l'état ---
  registerProprietaireForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;
  passwordFieldType: string = 'password';
  confirmPasswordFieldType: string = 'password';

  // Propriétés pour la force du mot de passe
  passwordStrengthPercent = 0;
  passwordStrengthText = '';
  passwordStrengthClass = 'strength-bar weak w-0'; // Classe CSS initiale

  // Propriétés pour l'upload de photo
  photoPreview: string | ArrayBuffer | null = null;
  selectedPhotoFile: File | null = null;
  defaultAvatarPath = 'assets/images/avatar-placeholder.png'; // Assurez-vous que ce chemin est correct
  avatarLoaded = false; // Pour gérer le spinner de chargement de l'avatar

  // Subscriptions pour le nettoyage
  private passwordSubscription: Subscription | undefined;
  private statutSubscription: Subscription | undefined;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef // Injecter ChangeDetectorRef si besoin de forcer la détection
  ) {
    // Initialisation du formulaire réactif
    this.registerProprietaireForm = this.fb.group({
      // Section Informations Personnelles
      prenom: ['', Validators.required],
      nomDeFamille: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]], // Validation email
      password: ['', [Validators.required, Validators.minLength(8)]], // Validation mot de passe
      confirmPassword: ['', Validators.required], // Requis, la correspondance est gérée par le validateur de groupe
      telephone: ['', Validators.required], // Validation téléphone (pourrait être plus stricte avec un pattern)

      // Section Informations Professionnelles
      statut: ['', Validators.required], // 'particulier' ou 'agence'
      nomAgence: [''], // Validateur ajouté dynamiquement
      siret: [''], // Validateur ajouté dynamiquement

      // Acceptation des conditions
      accepteConditionsGenerales: [false, Validators.requiredTrue] // Doit être coché (true)
    }, {
      validators: passwordMatchValidator() // Validateur pour la correspondance des mots de passe
    });

    // Précharger l'image d'avatar par défaut (côté client uniquement)
    this.preloadDefaultAvatar();
  }

  // --- Cycle de vie Angular ---

  ngOnInit(): void {
    // S'abonner aux changements du champ 'password' pour mettre à jour l'indicateur de force
    this.passwordSubscription = this.password?.valueChanges.subscribe(value => {
      this.updatePasswordStrength(value || '');
      // Revalider le champ de confirmation quand le mdp principal change
      this.confirmPassword?.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    });
    this.updatePasswordStrength(this.password?.value || ''); // Mettre à jour la force initiale

    // S'abonner aux changements du champ 'statut' pour ajuster les validateurs des champs pro
    this.statutSubscription = this.statut?.valueChanges.subscribe(statutValue => {
      this.updateProfessionalValidators(statutValue);
    });
    this.updateProfessionalValidators(this.statut?.value); // Appeler une fois au début
  }

  ngOnDestroy(): void {
    // Se désabonner pour éviter les fuites mémoire
    this.passwordSubscription?.unsubscribe();
    this.statutSubscription?.unsubscribe();
  }

  // --- Gestion de l'Avatar ---

  private preloadDefaultAvatar(): void {
    // S'assurer que cela s'exécute seulement dans le navigateur
    if (typeof window !== 'undefined') {
      const img = new Image();
      img.onload = () => {
        console.log('Avatar par défaut chargé avec succès');
        this.avatarLoaded = true;
        this.cdr.detectChanges(); // Forcer la détection si besoin
      };
      img.onerror = () => {
        console.error('Avatar par défaut introuvable à', this.defaultAvatarPath, '. Utilisation d\'un fallback.');
        this.defaultAvatarPath = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
        // On peut essayer de forcer le rechargement du fallback
        const fallbackImg = new Image();
        fallbackImg.onload = () => this.avatarLoaded = true;
        fallbackImg.src = this.defaultAvatarPath;
        this.cdr.detectChanges(); // Forcer la détection
      };
      img.src = this.defaultAvatarPath;
    } else {
      this.avatarLoaded = false; // Ou true si on ne veut pas de spinner en SSR
    }
  }

  get avatarUrl(): string {
    // Retourne l'aperçu si disponible, sinon l'avatar par défaut
    return this.photoPreview ? this.photoPreview.toString() : this.defaultAvatarPath;
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      // Validation type
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        this.errorMessage = "Format de fichier non supporté (JPG, PNG uniquement).";
        this.resetPhotoSelection(element); // Réinitialiser la sélection
        return;
      }
      // Validation taille
      if (file.size > 2 * 1024 * 1024) { // 2 Mo max
        this.errorMessage = "Le fichier est trop volumineux (Max 2Mo).";
        this.resetPhotoSelection(element);
        return;
      }

      // Fichier valide
      this.selectedPhotoFile = file;
      this.errorMessage = null; // Effacer les erreurs précédentes

      // Générer l'aperçu
      const reader = new FileReader();
      reader.onload = e => {
        this.photoPreview = reader.result;
        this.cdr.detectChanges(); // Mettre à jour la vue
      }
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.resetPhotoSelection();
  }

  private resetPhotoSelection(inputElement?: HTMLInputElement): void {
    this.selectedPhotoFile = null;
    this.photoPreview = null; // Reviendra à l'avatar par défaut via avatarUrl
    const fileInput = inputElement || document.getElementById('photoProfil') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; // Réinitialiser le champ input file
    }
    this.cdr.detectChanges(); // S'assurer que la vue est à jour
  }

  // --- Validation et Affichage Mot de Passe ---

  togglePasswordVisibility(): void {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordFieldType = this.confirmPasswordFieldType === 'password' ? 'text' : 'password';
  }

  updatePasswordStrength(password: string): void {
    // Logique pour calculer la force (adaptée de votre code)
    let strength = 0;
    if (!password) {
      this.passwordStrengthPercent = 0;
      this.passwordStrengthClass = 'strength-bar weak w-0';
      this.passwordStrengthText = '';
      return;
    }
    if (password.length >= 8) strength++; else strength = 0;
    if (password.length >= 10 && strength > 0) strength++;
    if (/[A-Z]/.test(password) && strength > 0) strength++;
    if (/[a-z]/.test(password) && strength > 0) strength++;
    if (/[0-9]/.test(password) && strength > 0) strength++;
    if (/[^a-zA-Z0-9\s]/.test(password) && strength > 0) strength++;

    this.passwordStrengthPercent = Math.min( (strength / 6) * 100, 100);

    let widthClass = '';
    // Ajustez ces classes si vous n'utilisez pas les classes JIT de Tailwind
    if (this.passwordStrengthPercent < 1) widthClass = 'w-0';
    else if (this.passwordStrengthPercent <= 20) widthClass = 'w-[20%]';
    else if (this.passwordStrengthPercent <= 40) widthClass = 'w-[40%]';
    else if (this.passwordStrengthPercent <= 60) widthClass = 'w-[60%]';
    else if (this.passwordStrengthPercent <= 80) widthClass = 'w-[80%]';
    else widthClass = 'w-full';

    if (strength <= 1) {
        this.passwordStrengthClass = `strength-bar very-weak ${widthClass}`; this.passwordStrengthText = 'Très Faible';
    } else if (strength <= 2) {
        this.passwordStrengthClass = `strength-bar weak ${widthClass}`; this.passwordStrengthText = 'Faible';
    } else if (strength <= 3) {
        this.passwordStrengthClass = `strength-bar medium ${widthClass}`; this.passwordStrengthText = 'Moyen';
    } else if (strength <= 4) {
        this.passwordStrengthClass = `strength-bar good ${widthClass}`; this.passwordStrengthText = 'Bon';
    } else {
        this.passwordStrengthClass = `strength-bar excellent ${widthClass}`; this.passwordStrengthText = 'Excellent';
    }
  }

  // --- Validation Conditionnelle (Champs Professionnels) ---

  updateProfessionalValidators(statut: string | null): void {
    const nomAgenceControl = this.nomAgence;
    const siretControl = this.siret;

    if (!nomAgenceControl || !siretControl) return;

    if (statut === 'agence') {
      // Ajouter le validateur requis si le statut est 'agence'
      nomAgenceControl.setValidators([Validators.required]);
      siretControl.setValidators([Validators.required]);
    } else {
      // Supprimer les validateurs si le statut n'est pas 'agence'
      nomAgenceControl.clearValidators();
      siretControl.clearValidators();
      // Optionnel: réinitialiser les valeurs si elles ne sont plus pertinentes
      // nomAgenceControl.reset('');
      // siretControl.reset('');
    }
    // Mettre à jour la validité des contrôles après avoir changé les validateurs
    nomAgenceControl.updateValueAndValidity();
    siretControl.updateValueAndValidity();
  }

  // --- Soumission du Formulaire (Logique Corrigée) ---

  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    // Marquer tous les champs comme touchés pour afficher les erreurs instantanément
    Object.values(this.registerProprietaireForm.controls).forEach(control => {
      control.markAsTouched();
    });
    this.registerProprietaireForm.updateValueAndValidity(); // Re-valider le formulaire globalement

    // Vérifier si le formulaire est invalide après avoir tout touché et revalidé
    if (this.registerProprietaireForm.invalid) {
      this.errorMessage = "Veuillez corriger les erreurs indiquées dans le formulaire.";
      // Focus sur le premier champ en erreur pour l'accessibilité
      const firstErrorField = document.querySelector('.ng-invalid:not(form)');
      if (firstErrorField instanceof HTMLElement) { // Vérifier que c'est bien un HTMLElement
        firstErrorField.focus();
      } else if (firstErrorField) {
         firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return; // Arrêter la soumission si invalide
    }

    this.isLoading = true; // Activer l'indicateur de chargement
    const formData = new FormData();

    // --- Construction Explicite du FormData pour correspondre au Backend ---

    // Champs attendus par @RequestParam dans AuthController
    formData.append('prenom', this.prenom?.value);
    formData.append('nomDeFamille', this.nomDeFamille?.value);
    formData.append('password', this.password?.value);
    formData.append('accepteTerms', String(this.accepteConditionsGenerales?.value)); // Convertir booléen en string
    formData.append('statut', this.statut?.value);

    // Champs optionnels (pour @RequestParam(required=false)) - N'envoyer que si non vide
    if (this.nomAgence?.value) {
        formData.append('nomAgence', this.nomAgence.value);
    }
    if (this.siret?.value) {
        formData.append('siret', this.siret.value);
    }

    // Champs qui seront liés par @ModelAttribute Proprietaire au backend
    formData.append('email', this.email?.value);
    formData.append('telephone', this.telephone?.value);
    // Les autres champs (nom, password, etc.) sont déjà ajoutés pour les @RequestParam
    // Spring devrait pouvoir mapper cela correctement à l'objet Proprietaire

    // Ajout du fichier photo (pour @RequestParam("photoProfil"))
    if (this.selectedPhotoFile) {
      formData.append('photoProfil', this.selectedPhotoFile, this.selectedPhotoFile.name);
    }

    // Débogage : Afficher le contenu de FormData
    // console.log("FormData envoyé au backend:");
    // formData.forEach((value, key) => { console.log(key + ":", value); });

    // --- Appel au service AuthService ---
    this.authService.registerProprietaire(formData)
      .pipe(finalize(() => {
        this.isLoading = false; // Désactiver l'indicateur de chargement à la fin
        this.cdr.detectChanges(); // S'assurer que la vue est mise à jour
      }))
      .subscribe({
        next: (response) => {
          console.log('Inscription propriétaire réussie:', response);
          this.successMessage = "Inscription réussie ! Vous allez être redirigé vers la page de connexion.";
          // Réinitialiser le formulaire et l'état
          this.registerProprietaireForm.reset({
            accepteConditionsGenerales: false // Remettre la checkbox à false
          });
          this.removePhoto();
          this.passwordStrengthPercent = 0;
          this.passwordStrengthText = '';
          this.passwordStrengthClass = 'strength-bar weak w-0';
          // Rediriger après un délai
          setTimeout(() => this.router.navigate(['/login']), 3000);
        },
        error: (error) => {
          console.error("Erreur d'inscription propriétaire:", error);
          this.successMessage = null; // Effacer le message de succès
          // Gestion des erreurs améliorée
          if (error.error && typeof error.error === 'string') {
             this.errorMessage = error.error; // Message d'erreur texte du backend
          } else if (error.status === 409) {
             this.errorMessage = "Cet email est déjà utilisé.";
             this.email?.setErrors({'emailTaken': true}); // Marquer le champ comme invalide
          } else if (error.status === 400) {
             this.errorMessage = "Données invalides. Veuillez vérifier le formulaire.";
             // Potentiellement analyser error.error pour plus de détails si le backend renvoie les erreurs par champ
          }
          else {
             this.errorMessage = "Une erreur serveur est survenue. Réessayez plus tard.";
          }
        }
      });
  }

  // --- Accesseurs pour faciliter l'accès aux contrôles dans le template HTML ---
  get prenom() { return this.registerProprietaireForm.get('prenom'); }
  get nomDeFamille() { return this.registerProprietaireForm.get('nomDeFamille'); }
  get email() { return this.registerProprietaireForm.get('email'); }
  get password() { return this.registerProprietaireForm.get('password'); }
  get confirmPassword() { return this.registerProprietaireForm.get('confirmPassword'); }
  get telephone() { return this.registerProprietaireForm.get('telephone'); }
  get statut() { return this.registerProprietaireForm.get('statut'); }
  get nomAgence() { return this.registerProprietaireForm.get('nomAgence'); }
  get siret() { return this.registerProprietaireForm.get('siret'); }
  get accepteConditionsGenerales() { return this.registerProprietaireForm.get('accepteConditionsGenerales'); }

  // --- Helpers pour l'affichage des erreurs dans le template HTML ---
  isInvalid(controlName: string, checkGroupError: boolean = false): boolean {
    const control = this.registerProprietaireForm.get(controlName);
    let controlIsInvalid = !!(control && control.invalid && (control.dirty || control.touched));

    // Gérer spécifiquement l'erreur de groupe pour la confirmation du mot de passe
    let groupError = false;
    if (checkGroupError && controlName === 'confirmPassword') {
      groupError = !!(this.registerProprietaireForm.hasError('passwordMismatch') && control?.touched);
    }
    return controlIsInvalid || groupError;
  }

  getError(controlName: string, errorCode: string): boolean {
    // Vérifie une erreur spécifique sur un contrôle donné
    return !!this.registerProprietaireForm.get(controlName)?.hasError(errorCode);
  }

  getFormError(errorCode: string): boolean {
    // Vérifie une erreur au niveau du groupe de formulaire (utile pour passwordMismatch)
    return !!this.registerProprietaireForm.hasError(errorCode);
  }
}