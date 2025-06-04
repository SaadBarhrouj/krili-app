// ===============================================================
// FICHIER COMPLET : src/app/proprietaire/profil-proprietaire/profil-proprietaire.component.ts
// (APPELLE AuthService.updateCurrentUserState apr??s succ??s)
// ===============================================================
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription, finalize } from 'rxjs';

// Services et DTOs
import { ProfileService } from '../../profile/profile.service'; // Assuming ProfileService is the correct one
import { ProfilProprietaireDTO } from '../../profile/profil-proprietaire.dto'; // Corrected path
import { AuthService } from '../../auth/auth.service'; // <-- IMPORT AuthService

@Component({
  selector: 'app-profil-proprietaire',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], // RouterLink supprim??
  templateUrl: './profil-proprietaire.component.html',
  styleUrls: ['./profil-proprietaire.component.css']
})
export class ProfilProprietaireComponent implements OnInit, OnDestroy {

  profileForm: FormGroup;
  isLoading = true;
  isSubmitting = false;
  isEditing = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  photoPreview: string | ArrayBuffer | null = null;
  selectedPhotoFile: File | null = null;
  initialAvatarUrl: string = 'assets/images/avatar-placeholder.png';
  private profileSub: Subscription | undefined;
  private updateSub: Subscription | undefined;
  private imageBaseUrl = 'http://localhost:8088/api/images/';

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService, // Reverted to ProfileService
    private cdr: ChangeDetectorRef,
    private authService: AuthService 
  ) {
    this.profileForm = this.fb.group({ /* ... initialisation ... */
        id: [{ value: null, disabled: true }], email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
        nom: [{ value: '', disabled: true }, Validators.required], telephone: [{ value: '', disabled: true }, Validators.required],
        statut: [{ value: '', disabled: true }], nomAgence: [{ value: '', disabled: true }], siret: [{ value: '', disabled: true }],
        nombreAbonnes: [{ value: 0, disabled: true }]
    });
  }

  ngOnInit(): void { this.loadProfileData(); }
  ngOnDestroy(): void { this.profileSub?.unsubscribe(); this.updateSub?.unsubscribe(); }

  loadProfileData(): void {
    this.isLoading = true; this.errorMessage = null; this.successMessage = null;
    this.profileSub = this.profileService.getProprietaireProfile().pipe(finalize(() => this.isLoading = false)) // Reverted to profileService
    .subscribe({
        next: (data: ProfilProprietaireDTO) => {
            this.profileForm.patchValue(data);
            if (data.avatar) { this.initialAvatarUrl = `${this.imageBaseUrl}${data.avatar}`; }
            else { this.initialAvatarUrl = 'assets/images/avatar-placeholder.png'; }
            this.photoPreview = this.initialAvatarUrl; this.selectedPhotoFile = null; this.isEditing = false;
            this.profileForm.disable();
            // Ractiver spcifiques pour affichage
            this.profileForm.get('email')?.disable(); this.profileForm.get('statut')?.disable();
            this.profileForm.get('siret')?.disable(); this.profileForm.get('nombreAbonnes')?.disable();
            this.cdr.detectChanges();
        },
        error: (err: any) => { this.errorMessage = err.message || "Erreur chargement profil."; }
    });
  }
  toggleEditMode(): void { /* ... code identique ?? avant, avec enable/disable ... */
      this.isEditing = !this.isEditing; this.errorMessage = null; this.successMessage = null;
      if (this.isEditing) {
        this.profileForm.get('nom')?.enable(); this.profileForm.get('telephone')?.enable();
        // if (this.profileForm.get('statut')?.value === 'agence') { /* this.profileForm.get('nomAgence')?.enable(); */ }
      } else { this.profileForm.disable(); this.loadProfileData(); this.resetPhotoSelection(false); }
      this.cdr.detectChanges();
  }
  onFileSelected(event: Event): void { /* ... code identique ?? avant ... */
      const element = event.currentTarget as HTMLInputElement; const fileList: FileList | null = element.files;
      if (fileList && fileList[0]) {
          const file = fileList[0];
          if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) { this.errorMessage = "Format invalide."; this.resetPhotoSelection(); return; }
          if (file.size > 2 * 1024 * 1024) { this.errorMessage = "Fichier trop lourd (Max 2Mo)."; this.resetPhotoSelection(); return; }
          this.selectedPhotoFile = file; this.errorMessage = null;
          const reader = new FileReader(); reader.onload = e => { this.photoPreview = reader.result; this.cdr.detectChanges(); }
          reader.readAsDataURL(file);
      }
  }
  resetPhotoSelection(resetInputElement: boolean = true): void { /* ... code identique ?? avant ... */
    this.selectedPhotoFile = null; this.photoPreview = this.initialAvatarUrl;
    if (resetInputElement) { const fileInput = document.getElementById('photoProfilEdit') as HTMLInputElement; if (fileInput) fileInput.value = ''; }
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    Object.keys(this.profileForm.controls).forEach(key => { const c=this.profileForm.get(key); if(c?.enabled){c.markAsTouched();c.updateValueAndValidity();} });
    if (this.profileForm.invalid) { this.errorMessage = "Champs invalides."; return; }
    this.isSubmitting = true; this.errorMessage = null; this.successMessage = null;
    const formData = new FormData(); let hasDataToSend = false;
    Object.keys(this.profileForm.controls).forEach(key=>{ const c=this.profileForm.get(key); if(c&&c.enabled&&c.dirty){formData.append(key,c.value);hasDataToSend=true;} });
    if (this.selectedPhotoFile) { formData.append('photoProfil', this.selectedPhotoFile, this.selectedPhotoFile.name); hasDataToSend = true; }
    if (!hasDataToSend) { this.successMessage = "Aucune modification."; this.isSubmitting = false; this.toggleEditMode(); return; }

    console.log("ProfilProprietaire: Envoi MAJ...");
    this.updateSub = this.profileService.updateProprietaireProfile(formData).pipe( // Reverted to profileService
        finalize(() => this.isSubmitting = false)
    ).subscribe({
        // ---> MODIFICATION DANS LE NEXT: <---
        next: (response: { message: string, token?: string, newAvatarId?: string }) => {
            this.successMessage = response.message || "Profil mis ?? jour avec succ??s !";
            console.log("ProfilProprietaire: R??ponse MAJ:", response);

            // 1. Mettre ?? jour le token et l'??tat global si un nouveau token est re??u
            if (response.token) {
                console.log("ProfilProprietaire: Nouveau token re??u, MAJ AuthService.");
                this.authService.saveTokenAndUpdateState(response.token); // Utilise la m??thode qui met ?? jour localStorage ET le BehaviorSubject
                 // Mettre ?? jour l'avatar initial local (pour la prochaine ??dition) bas?? sur le nouveau token
                 const updatedState = this.authService.getCurrentUserSnapshot();
                 this.initialAvatarUrl = updatedState?.avatar ? `${this.imageBaseUrl}${updatedState.avatar}` : 'assets/images/avatar-placeholder.png';

            } else {
              // Si pas de nouveau token, MAJ manuelle de l'??tat local AuthService (moins pr??cis)
                const updatedData: Partial<ProfilProprietaireDTO> = {};
                if (this.profileForm.get('nom')?.dirty) updatedData.nom = this.profileForm.get('nom')?.value;
                if (this.profileForm.get('telephone')?.dirty) updatedData.telephone = this.profileForm.get('telephone')?.value;
                if (response.newAvatarId) updatedData.avatar = response.newAvatarId; // MAJ avatar sp??cifiquement
                if (Object.keys(updatedData).length > 0) {
                   this.authService.updateCurrentUserState(updatedData);
                }
                 // Mettre ?? jour l'avatar initial local pour la prochaine ??dition
                 if (response.newAvatarId) {
                    this.initialAvatarUrl = `${this.imageBaseUrl}${response.newAvatarId}`;
                 }
            }

            // 2. Mettre ?? jour l'affichage local imm??diat
            this.photoPreview = this.initialAvatarUrl;
            this.selectedPhotoFile = null;
            this.profileForm.markAsPristine(); // Marquer comme non modifi??
            this.isEditing = false; // Quitter le mode ??dition
            this.profileForm.disable(); // Re-d??sactiver le formulaire
             // R??activer sp??cifiques pour affichage
             this.profileForm.get('email')?.disable(); this.profileForm.get('statut')?.disable();
             this.profileForm.get('siret')?.disable(); this.profileForm.get('nombreAbonnes')?.disable();
            this.cdr.detectChanges();

        },
        error: (err: any) => {
            this.errorMessage = err.message || "Erreur lors de la mise jour du profil.";
            console.error("ProfilProprietaire: Erreur MAJ profil:", err);
        }
    });
  }

   // Getters
   get nom() { return this.profileForm.get('nom'); }
   get telephone() { return this.profileForm.get('telephone'); }
   get email() { return this.profileForm.get('email'); }
   get statut() { return this.profileForm.get('statut'); }
   get nomAgence() { return this.profileForm.get('nomAgence'); }
   get siret() { return this.profileForm.get('siret'); }
   get nombreAbonnes() { return this.profileForm.get('nombreAbonnes'); }
   get currentAvatarDisplay(): string { return (this.photoPreview ? this.photoPreview.toString() : this.initialAvatarUrl); }
}