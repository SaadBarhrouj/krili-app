import { AuthService } from '../auth.service'; // Assurez-vous que le chemin est correct
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { VilleService, VilleDTO } from '../../shared/ville.service';
import { EtablissementService, EtablissementDTO } from '../../shared/etablissement.service';


// --- Validateur Personnalisé pour MDP ---
export function passwordMatchValidator(): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const passwordControl = formGroup.get('password');
    const confirmPasswordControl = formGroup.get('confirmPassword');

    // Ne rien faire si les contrôles ne sont pas encore prêts ou si confirmPassword n'a pas été touché
    if (!passwordControl || !confirmPasswordControl || !confirmPasswordControl.dirty) {
      return null;
    }

    if (passwordControl.value !== confirmPasswordControl.value) {
      confirmPasswordControl.setErrors({ ...confirmPasswordControl.errors, 'passwordMismatch': true });
      // Important: retourner l'erreur au niveau du groupe pour que getFormError fonctionne
      return { 'passwordMismatch': true };
    } else {
      // Si les mots de passe correspondent, supprimer l'erreur 'passwordMismatch' du contrôle
      const errors = { ...confirmPasswordControl.errors };
      delete errors['passwordMismatch'];
      confirmPasswordControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      // Et s'assurer qu'aucune erreur de groupe n'est retournée pour cette raison
      return null;
    }
  };
}
// --- Fin Validateur ---

@Component({
  selector: 'app-register-etudiant',
  standalone: true,
  imports: [ ReactiveFormsModule, CommonModule, RouterLink ], // FormsModule removed as not strictly needed for reactive selects
  templateUrl: './register-etudiant.component.html',
  styleUrls: ['./register-etudiant.component.css'] // Assurez-vous que le chemin est correct
})
export class RegisterEtudiantComponent implements OnInit, OnDestroy {

  // --- Propriétés du composant ---
  registerEtudiantForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;
  passwordFieldType: string = 'password';
  confirmPasswordFieldType: string = 'password';
  passwordStrengthPercent = 0;
  passwordStrengthText = '';
  passwordStrengthClass = 'strength-bar weak w-0';
  photoPreview: string | ArrayBuffer | null = null;
  selectedPhotoFile: File | null = null;
  defaultAvatarPath = 'assets/images/avatar-placeholder.png'; // Assurez-vous que ce chemin est correct
  avatarLoaded = false; // Initialisé à false

  villes: VilleDTO[] = [];
  etablissements: EtablissementDTO[] = [];
  initialEtablissementsLoaded = false;
  anneesEtudeOptions: number[] = [1, 2, 3, 4, 5, 6];


  private passwordSubscription: Subscription | undefined;
  private villeSubscription: Subscription | undefined;
  // private etablissementSubscription: Subscription | undefined; // Not strictly needed if not subscribing to etablissement changes

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef, 
    @Inject(PLATFORM_ID) private platformId: Object,
    private villeService: VilleService,
    private etablissementService: EtablissementService
  ) {
    this.registerEtudiantForm = this.fb.group({
      prenom: ['', Validators.required],
      nomDeFamille: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      telephone: ['', Validators.required],
      filiere: ['', Validators.required],
      anneeEtude: ['', Validators.required], // Modifié pour select, min/max/pattern retirés
      villeEtude: ['', Validators.required], // Will store ville.id
      etablissement: [{ value: '', disabled: true }, Validators.required], // Will store etablissement.id, initially disabled
      accepteTerms: [false, Validators.requiredTrue]
    }, { validators: passwordMatchValidator() });

    this.preloadDefaultAvatar();
  }

  private preloadDefaultAvatar(): void {
    if (isPlatformBrowser(this.platformId)) {
        const img = new Image();
        img.src = this.defaultAvatarPath;
        img.onload = () => {
            this.avatarLoaded = true;
            this.cdr.detectChanges();
        };
        img.onerror = () => {
            // console.error('Failed to preload default avatar.');
        };
    } else {
        this.avatarLoaded = true; 
    }
  }

  get avatarUrl(): string {
    return this.photoPreview ? this.photoPreview.toString() : (this.avatarLoaded ? this.defaultAvatarPath : '');
  }

  ngOnInit(): void {
    this.passwordSubscription = this.password?.valueChanges.subscribe(value => {
        this.updatePasswordStrength(value || '');
        this.confirmPassword?.updateValueAndValidity();
    });
    this.updatePasswordStrength(this.password?.value || '');

    this.loadVilles();

    this.villeSubscription = this.registerEtudiantForm.get('villeEtude')?.valueChanges.subscribe(villeId => {
      this.etablissements = [];
      this.initialEtablissementsLoaded = false;
      const etablissementControl = this.registerEtudiantForm.get('etablissement');
      etablissementControl?.setValue(''); 

      if (villeId) {
        etablissementControl?.enable();
        this.loadEtablissements(villeId);
      } else {
        etablissementControl?.disable();
      }
    });
  }

  ngOnDestroy(): void {
    this.passwordSubscription?.unsubscribe();
    this.villeSubscription?.unsubscribe();
  }

  private loadVilles(): void {
    this.isLoading = true; // General loading indicator can be used
    this.villeService.getVilles().subscribe({
      next: (data) => {
        this.villes = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des villes:', err);
        this.errorMessage = 'Impossible de charger la liste des villes.';
        this.registerEtudiantForm.get('villeEtude')?.disable();
        this.registerEtudiantForm.get('etablissement')?.disable();
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadEtablissements(villeId: string | number): void {
    const numericVilleId = Number(villeId);
    if (isNaN(numericVilleId) || numericVilleId <= 0) {
        this.etablissements = [];
        this.initialEtablissementsLoaded = true;
        // Keep etablissement control enabled but it will have no options other than default
        this.cdr.detectChanges();
        return;
    }

    // Consider a specific loading state for etablissements if needed
    // this.isLoadingEtablissements = true;
    this.etablissementService.getEtablissementsByVille(numericVilleId).subscribe({
      next: (data) => {
        this.etablissements = data;
        this.initialEtablissementsLoaded = true;
        // this.isLoadingEtablissements = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(`Erreur lors du chargement des établissements pour la ville ${numericVilleId}:`, err);
        this.errorMessage = 'Impossible de charger la liste des établissements pour cette ville.';
        this.etablissements = [];
        this.initialEtablissementsLoaded = true;
        // this.isLoadingEtablissements = false;
        this.cdr.detectChanges();
      }
    });
  }


  // --- Méthodes utilitaires (inchangées pour la plupart) ---
  togglePasswordVisibility(): void {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordFieldType = this.confirmPasswordFieldType === 'password' ? 'text' : 'password';
  }

  updatePasswordStrength(password: string): void {
    let strength = 0;
    if (!password) {
        this.passwordStrengthPercent = 0;
        this.passwordStrengthText = '';
        this.passwordStrengthClass = 'strength-bar weak w-0';
        this.cdr.detectChanges();
        return;
    }
    if (password.length >= 8) strength++; else strength = 0;
    if (password.length >= 10 && strength > 0) strength++;
    if (/[A-Z]/.test(password) && strength > 0) strength++;
    if (/[a-z]/.test(password) && strength > 0) strength++;
    if (/[0-9]/.test(password) && strength > 0) strength++;
    if (/[^a-zA-Z0-9\s]/.test(password) && strength > 0) strength++;
    this.passwordStrengthPercent = Math.min( (strength / 6) * 100, 100);
    let widthClass = 'w-0';
    if (this.passwordStrengthPercent <= 0) widthClass = 'w-0';
    else if (this.passwordStrengthPercent <= 20) widthClass = 'w-[20%]';
    else if (this.passwordStrengthPercent <= 40) widthClass = 'w-[40%]';
    else if (this.passwordStrengthPercent <= 60) widthClass = 'w-[60%]';
    else if (this.passwordStrengthPercent <= 80) widthClass = 'w-[80%]';
    else widthClass = 'w-full';

    let text = 'Très faible';
    let barClass = 'strength-bar weak';

    if (strength <= 1) { text = 'Très faible'; barClass = 'strength-bar weak'; }
    else if (strength <= 2) { text = 'Faible'; barClass = 'strength-bar medium'; }
    else if (strength <= 3) { text = 'Moyen'; barClass = 'strength-bar medium'; }
    else if (strength <= 4) { text = 'Fort'; barClass = 'strength-bar strong'; }
    else { text = 'Très fort'; barClass = 'strength-bar very-strong'; }

    this.passwordStrengthText = text;
    this.passwordStrengthClass = `${barClass} ${widthClass}`;
    this.cdr.detectChanges();
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
        const file = fileList[0];
        if (file.size > 2 * 1024 * 1024) { 
            this.errorMessage = "Le fichier est trop volumineux (Max 2Mo).";
            this.resetPhotoSelection(element);
            return;
        }
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            this.errorMessage = "Format de fichier non supporté (JPG, PNG uniquement).";
            this.resetPhotoSelection(element);
            return;
        }

        this.selectedPhotoFile = file;
        const reader = new FileReader();
        reader.onload = e => {
            this.photoPreview = reader.result;
            this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
        this.errorMessage = null; 
    } else {
        this.resetPhotoSelection(element);
    }
  }

  private resetPhotoSelection(inputElement: HTMLInputElement | null = null): void {
    this.photoPreview = null;
    this.selectedPhotoFile = null;
    if (inputElement) {
        inputElement.value = ""; 
    }
    this.cdr.detectChanges();
  }

  removePhoto(): void {
    this.resetPhotoSelection(); 
  }

  // --- Gestion soumission ---
  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.registerEtudiantForm.invalid) {
      Object.values(this.registerEtudiantForm.controls).forEach(control => {
        control.markAsTouched();
      });
      if (this.registerEtudiantForm.errors?.['passwordMismatch']) {
        this.errorMessage = "Les mots de passe ne correspondent pas.";
      } else {
        this.errorMessage = "Veuillez corriger les erreurs dans le formulaire.";
      }
      return;
    }

    this.isLoading = true;

    const formData = new FormData();
    // Use getRawValue to include disabled controls like 'etablissement' if it was disabled but has a value
    const formValue = this.registerEtudiantForm.getRawValue(); 

    Object.keys(formValue).forEach(key => {
      // Inclure accepteTerms, exclure seulement confirmPassword
      if (key !== 'confirmPassword') { 
        if (formValue[key] !== null && formValue[key] !== undefined) {
          // FormData convertit les booléens en chaînes "true" ou "false", ce qui est généralement bien géré par Spring Boot
          formData.append(key, formValue[key]);
        }
      }
    });

    if (this.selectedPhotoFile) {
      formData.append('photoProfil', this.selectedPhotoFile, this.selectedPhotoFile.name);
    }

    this.authService.registerEtudiant(formData)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.successMessage = "Inscription réussie ! Vous allez être redirigé vers la page de connexion.";
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: (error) => {
          this.errorMessage = error.error?.message || error.message || "Une erreur est survenue lors de l'inscription.";
          if (error.status === 409) { 
            this.errorMessage = "Cette adresse e-mail est déjà utilisée.";
            this.email?.setErrors({'duplicate': true});
          }
        }
      });
  }

  // --- Helpers pour le template (inchangés) ---
  formControl(name: string): AbstractControl | null {
    return this.registerEtudiantForm.get(name);
  }

  isInvalid(name: string, checkGroupError: boolean = false): boolean {
    const control = this.formControl(name);
    // Vérifier si le contrôle lui-même est invalide et a été touché/modifié
    let controlInvalid = !!(control && control.invalid && (control.dirty || control.touched));
    // Vérifier les erreurs de groupe spécifiquement pour confirmPassword
    let groupError = false;
    if (checkGroupError && name === 'confirmPassword') {
      groupError = !!(this.registerEtudiantForm.hasError('passwordMismatch') && control?.touched);
    }
    return controlInvalid || groupError;
  }

  getError(name: string, errorCode: string): boolean {
    return !!this.formControl(name)?.hasError(errorCode);
  }

  getFormError(errorCode: string): boolean {
    // Vérifie une erreur au niveau du groupe de formulaire
    return !!this.registerEtudiantForm.hasError(errorCode);
  }

  // --- Accesseurs pour un accès plus facile dans le template (optionnel mais propre) ---
  get prenom() { return this.formControl('prenom'); }
  get nomDeFamille() { return this.formControl('nomDeFamille'); }
  get email() { return this.formControl('email'); }
  get password() { return this.formControl('password'); }
  get confirmPassword() { return this.formControl('confirmPassword'); }
  get telephone() { return this.formControl('telephone'); }
  get filiere() { return this.formControl('filiere'); }
  get anneeEtude() { return this.formControl('anneeEtude'); }
  get villeEtude() { return this.formControl('villeEtude'); }
  get accepteTerms() { return this.formControl('accepteTerms'); }
  get etablissement() { return this.formControl('etablissement'); }
}