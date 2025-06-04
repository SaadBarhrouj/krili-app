import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
// MODIFIER CETTE LIGNE pour inclure 'tap'
import { Subscription, finalize, forkJoin, map, of, switchMap, Observable, catchError, tap } from 'rxjs';

import { AuthService, CurrentUserState, UpdateProfileResponse } from '../../auth/auth.service';
import { VilleService, VilleDTO } from '../../shared/ville.service';
import { EtablissementService, EtablissementDTO } from '../../shared/etablissement.service';

// ... (le reste du composant reste identique à la version que je vous ai fournie précédemment) ...

interface EtudiantProfileViewModel {
  nom: string;
  email: string;
  telephone?: string | null;
  avatar?: string | null;
  etablissementNom?: string | null;
  villeNom?: string | null;
  filiere?: string | null;
  anneeEtude?: number | null;
  villeEtudeId?: number | null;
  etablissementId?: number | null;
}

@Component({
  selector: 'app-profil-etudiant',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profil-etudiant.component.html',
  styleUrls: ['./profil-etudiant.component.css']
})
export class ProfilEtudiantComponent implements OnInit, OnDestroy {

  etudiantProfile: EtudiantProfileViewModel | null = null;
  profileEditForm: FormGroup;

  isLoading = true;
  isEditing = false;
  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  selectedAvatarFile: File | null = null;
  avatarDisplayUrl: string = 'assets/images/avatar-placeholder.png';
  private imageBaseUrl = 'http://localhost:8088/api/images/';
  private userSubscription: Subscription | undefined;
  private dataLoadingSubscription: Subscription | undefined;

  availableVillesForEdit: VilleDTO[] = [];
  availableEtablissementsForEdit: EtablissementDTO[] = [];
  isLoadingVillesForEdit = false;
  isLoadingEtablissementsForEdit = false;
  anneesEtudeOptions: number[] = Array.from({ length: 8 }, (_, i) => i + 1);

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private villeService: VilleService,
    private etablissementService: EtablissementService
  ) {
    this.profileEditForm = this.fb.group({
      nom: ['', Validators.required],
      telephone: [''],
      villeEtudeId: [null as number | null],
      etablissementId: [{ value: null as number | null, disabled: true }],
      filiere: [''],
      anneeEtude: [null as number | null]
    });
  }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.pipe(
      tap(() => {
        this.isLoading = true;
        this.errorMessage = null;
        this.etudiantProfile = null;
        this.updateAvatarDisplay(null);
        if (this.isEditing) this.toggleEditMode();
      }),
      switchMap((userState: CurrentUserState | null) => {
        if (!userState || !userState.isLoggedIn || userState.isProprietaireRole) {
          this.isLoading = false;
          this.errorMessage = "Profil étudiant non disponible ou accès non autorisé.";
          return of(null);
        }
        return this.loadAndPrepareProfileData(userState);
      })
    ).subscribe({
      next: (profileVm) => {
        this.isLoading = false;
        if (profileVm) {
          this.etudiantProfile = profileVm;
          this.initFormWithProfileData(); // Initialize form for readonly display
        } else if (!this.errorMessage) { // Avoid overwriting specific error from switchMap
          this.errorMessage = "Profil étudiant non trouvé ou erreur lors de la récupération.";
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = "Erreur système lors du chargement du profil.";
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.dataLoadingSubscription?.unsubscribe();
  }

  private loadAndPrepareProfileData(userState: CurrentUserState): Observable<EtudiantProfileViewModel | null> {
    const baseProfile: EtudiantProfileViewModel = {
      nom: userState.nom,
      email: userState.email,
      telephone: userState.telephone,
      avatar: userState.avatar,
      filiere: userState.filiere,
      anneeEtude: userState.anneeEtude,
      villeEtudeId: typeof userState.villeEtude === 'number' ? userState.villeEtude : null,
      etablissementId: typeof userState.etablissement === 'number' ? userState.etablissement : null,
      villeNom: typeof userState.villeEtude === 'string' && isNaN(parseInt(userState.villeEtude, 10)) ? userState.villeEtude : undefined,
      etablissementNom: typeof userState.etablissement === 'string' && isNaN(parseInt(userState.etablissement, 10)) ? userState.etablissement : undefined,
    };
    this.updateAvatarDisplay(userState.avatar);

    const villeNom$ = baseProfile.villeEtudeId && !baseProfile.villeNom
      ? this.villeService.getVilleById(baseProfile.villeEtudeId).pipe(map(v => v?.nom || null), catchError(() => of(`ID: ${baseProfile.villeEtudeId}`)))
      : of(baseProfile.villeNom || null);

    const etablissementNom$ = baseProfile.etablissementId && !baseProfile.etablissementNom
      ? this.etablissementService.getEtablissementById(baseProfile.etablissementId).pipe(map(e => e?.nom || null), catchError(() => of(`ID: ${baseProfile.etablissementId}`)))
      : of(baseProfile.etablissementNom || null);

    return forkJoin({ villeNom: villeNom$, etablissementNom: etablissementNom$ }).pipe(
      map(resolvedNames => {
        baseProfile.villeNom = resolvedNames.villeNom || baseProfile.villeNom || 'Non renseignée';
        baseProfile.etablissementNom = resolvedNames.etablissementNom || baseProfile.etablissementNom || 'Non renseigné';
        return baseProfile;
      })
    );
  }

  private updateAvatarDisplay(avatarIdentifier: string | null | undefined): void {
    if (avatarIdentifier) {
      this.avatarDisplayUrl = avatarIdentifier.startsWith('http') || avatarIdentifier.startsWith('data:') || avatarIdentifier.startsWith('assets/')
        ? avatarIdentifier
        : `${this.imageBaseUrl}${avatarIdentifier}`;
    } else {
      this.avatarDisplayUrl = 'assets/images/avatar-placeholder.png';
    }
  }

  async toggleEditMode(): Promise<void> {
    this.isEditing = !this.isEditing;
    this.errorMessage = null;
    this.successMessage = null;
    if (this.isEditing) {
      this.initFormWithProfileData();
      await this.loadVillesForEdit();
      if (this.profileEditForm.get('villeEtudeId')?.value) {
        await this.loadEtablissementsForEdit(this.profileEditForm.get('villeEtudeId')?.value);
      }
    } else {
      this.selectedAvatarFile = null;
      this.updateAvatarDisplay(this.etudiantProfile?.avatar);
    }
    this.cdr.detectChanges();
  }

  private initFormWithProfileData(): void {
    if (this.etudiantProfile) {
        this.profileEditForm.patchValue({
            nom: this.etudiantProfile.nom,
            telephone: this.etudiantProfile.telephone || '',
            filiere: this.etudiantProfile.filiere || '',
            anneeEtude: this.etudiantProfile.anneeEtude || null,
            villeEtudeId: this.etudiantProfile.villeEtudeId || null,
            etablissementId: this.etudiantProfile.etablissementId || null
        });

      if (this.etudiantProfile.villeEtudeId) {
        this.profileEditForm.get('etablissementId')?.enable();
      } else {
        this.profileEditForm.get('etablissementId')?.disable();
      }
    }
  }


  async loadVillesForEdit(): Promise<void> {
    if (this.availableVillesForEdit.length > 0 && !this.isLoadingVillesForEdit) return;
    this.isLoadingVillesForEdit = true;
    try {
      const villes = await this.villeService.getVilles().toPromise();
      this.availableVillesForEdit = villes || [];
    } catch (error) {
      console.error("Erreur chargement villes pour édition:", error);
      this.availableVillesForEdit = [];
    } finally {
      this.isLoadingVillesForEdit = false;
      this.cdr.detectChanges();
    }
  }

  onVilleForEditChange(): void {
    const villeId = this.profileEditForm.get('villeEtudeId')?.value;
    this.profileEditForm.get('etablissementId')?.reset(null);
    this.availableEtablissementsForEdit = [];
    if (villeId) {
      this.profileEditForm.get('etablissementId')?.enable();
      this.loadEtablissementsForEdit(villeId);
    } else {
      this.profileEditForm.get('etablissementId')?.disable();
    }
    this.cdr.detectChanges();
  }

  async loadEtablissementsForEdit(villeId: number): Promise<void> {
    this.isLoadingEtablissementsForEdit = true;
    this.profileEditForm.get('etablissementId')?.disable();
    try {
      const etabs = await this.etablissementService.getEtablissementsByVille(villeId).toPromise();
      this.availableEtablissementsForEdit = etabs || [];
    } catch (error) {
      console.error("Erreur chargement établissements pour édition:", error);
      this.availableEtablissementsForEdit = [];
    } finally {
      this.isLoadingEtablissementsForEdit = false;
      if (this.profileEditForm.get('villeEtudeId')?.value) {
        this.profileEditForm.get('etablissementId')?.enable();
      }
      this.cdr.detectChanges();
    }
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        this.errorMessage = "Format d'image invalide (PNG, JPG, JPEG).";
        this.selectedAvatarFile = null; input.value = ''; return;
      }
      if (file.size > 2 * 1024 * 1024) {
        this.errorMessage = "L'image est trop volumineuse (max 2MB).";
        this.selectedAvatarFile = null; input.value = ''; return;
      }
      this.selectedAvatarFile = file;
      this.errorMessage = null;
      const reader = new FileReader();
      reader.onload = () => {
        this.avatarDisplayUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.selectedAvatarFile);
    }
  }

  onSaveChanges(): void {
    if (this.profileEditForm.invalid) {
      this.profileEditForm.markAllAsTouched();
      this.errorMessage = "Veuillez corriger les erreurs du formulaire.";
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    this.successMessage = null;

    const formData = new FormData();
    const formValues = this.profileEditForm.value;
    let hasChanges = false;

    if (this.etudiantProfile?.nom !== formValues.nom) {
      formData.append('nom', formValues.nom); hasChanges = true;
    }
    if (this.etudiantProfile?.telephone !== formValues.telephone && (formValues.telephone !== null || this.etudiantProfile?.telephone !== null)) {
      formData.append('telephone', formValues.telephone || ''); hasChanges = true;
    }

    const selectedVilleDTO = this.availableVillesForEdit.find(v => v.id === formValues.villeEtudeId);
    if (selectedVilleDTO && this.etudiantProfile?.villeNom !== selectedVilleDTO.nom) {
      formData.append('villeEtude', selectedVilleDTO.nom); hasChanges = true;
    } else if (!selectedVilleDTO && formValues.villeEtudeId === null && this.etudiantProfile?.villeNom && this.etudiantProfile.villeNom !== 'Non renseignée') {
        formData.append('villeEtude', ''); hasChanges = true;
    }

    const selectedEtablissementDTO = this.availableEtablissementsForEdit.find(e => e.id === formValues.etablissementId);
    if (selectedEtablissementDTO && this.etudiantProfile?.etablissementNom !== selectedEtablissementDTO.nom) {
      formData.append('etablissement', selectedEtablissementDTO.nom); hasChanges = true;
    } else if (!selectedEtablissementDTO && formValues.etablissementId === null && this.etudiantProfile?.etablissementNom && this.etudiantProfile.etablissementNom !== 'Non renseigné') {
        formData.append('etablissement', ''); hasChanges = true;
    }

    if (this.etudiantProfile?.filiere !== formValues.filiere && (formValues.filiere !== null || this.etudiantProfile?.filiere !== null)) {
      formData.append('filiere', formValues.filiere || ''); hasChanges = true;
    }
    if (this.etudiantProfile?.anneeEtude !== formValues.anneeEtude && (formValues.anneeEtude !== null || this.etudiantProfile?.anneeEtude !== null) ) {
      if (formValues.anneeEtude !== null) {
        formData.append('anneeEtude', formValues.anneeEtude.toString());
      } else {
        // Pour 'effacer' une année d'étude, le backend doit gérer une valeur vide ou spécifique
        // Pour l'instant, si on déselectionne, on n'envoie pas le champ,
        // il faut que le backend interprète l'absence comme "pas de changement" ou
        // qu'on envoie une chaîne vide si le type backend est String pour anneeEtude.
        // Puisque c'est un Integer au backend, on envoie seulement si la valeur est présente.
      }
      hasChanges = true;
    }

    if (this.selectedAvatarFile) {
      formData.append('photoProfil', this.selectedAvatarFile, this.selectedAvatarFile.name);
      hasChanges = true;
    }

    if (!hasChanges) {
        this.successMessage = "Aucune modification détectée.";
        this.isSubmitting = false;
        this.isEditing = false;
        this.profileEditForm.disable();
        this.cdr.detectChanges();
        return;
    }

    this.dataLoadingSubscription = this.authService.updateEtudiantProfile(formData)
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: UpdateProfileResponse) => {
          this.successMessage = response.message || "Profil mis à jour avec succès !";
          this.isEditing = false;
          this.selectedAvatarFile = null;
          this.profileEditForm.disable();
          // L'AuthService met à jour le currentUser$, ce qui déclenchera le rechargement via ngOnInit.
        },
        error: (err: Error) => {
          this.errorMessage = err.message || "Erreur lors de la mise à jour.";
        }
      });
  }

  get nomCtrl() { return this.profileEditForm.get('nom'); }
  get telephoneCtrl() { return this.profileEditForm.get('telephone'); }
  get villeEtudeIdCtrl() { return this.profileEditForm.get('villeEtudeId'); }
  get etablissementIdCtrl() { return this.profileEditForm.get('etablissementId'); }
  get filiereCtrl() { return this.profileEditForm.get('filiere'); }
  get anneeEtudeCtrl() { return this.profileEditForm.get('anneeEtude'); }
}