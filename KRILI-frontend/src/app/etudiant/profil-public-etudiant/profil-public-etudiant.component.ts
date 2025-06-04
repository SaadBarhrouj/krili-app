// FICHIER: KRILI-frontend\src\app\proprietaire\profil-public-etudiant\profil-public-etudiant.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, forkJoin, finalize, of, Observable } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import { EtudiantService } from '../../shared/etudiant.service';
import { EtudiantPublicProfilDTO } from '../../models/etudiant-public-profil.dto';
import { ReviewService } from '../../shared/review.service';
import { ReviewDTO, Page as ReviewPageType, ReviewCreationPayload, ReviewType } from '../../models/review.dto';
import { AuthService } from '../../auth/auth.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { VilleService, VilleDTO } from '../../shared/ville.service';
import { EtablissementService, EtablissementDTO } from '../../shared/etablissement.service';

// Interface pour les données enrichies du profil
interface EtudiantProfilEnrichi {
  id: number;
  nom: string;
  avatar?: string | null;
  etablissement?: string | null;
  etablissementNom?: string | null;
  filiere?: string | null;
  anneeEtude?: number | null;
  villeEtude?: string | null;
  villeNom?: string | null;
  avgRatingFromProprietaires?: number | null;
  reviewCountFromProprietaires?: number | null;
  isLoadingAcademicInfo?: boolean;
}

@Component({
  selector: 'app-profil-public-etudiant',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, CurrencyPipe, ReactiveFormsModule],
  templateUrl: './profil-public-etudiant.component.html',
  styleUrls: ['./profil-public-etudiant.component.css']
})
export class ProfilPublicEtudiantComponent implements OnInit, OnDestroy {

  etudiantProfil: EtudiantProfilEnrichi | null = null;
  reviewsPage: ReviewPageType<ReviewDTO> | null = null;

  isLoadingProfil = true;
  isLoadingReviews = false;
  isLoadingAcademicInfo = false;
  profilError: string | null = null;
  reviewsError: string | null = null;

  currentReviewsPage = 0;
  reviewsPageSize = 5;

  private routeSub: Subscription | undefined;
  private dataSub: Subscription | undefined;
  private imageBaseUrl = 'http://localhost:8088/api/images/';
  Math = Math;

  // Propriétés pour l'avis du propriétaire
  isCurrentUserProprietaire = false;
  canLeaveReviewOnThisEtudiant = false;
  eligibleReservationsForReview: { id: number; description: string; logementAdresse?: string }[] = [];
  
  showReviewForm = false;
  reviewFormProprietaire: FormGroup;
  isSubmittingReview = false;
  reviewSubmissionError: string | null = null;
  avisSoumisPourReservationIds: Set<number> = new Set();


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private etudiantService: EtudiantService,
    private reviewService: ReviewService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private villeService: VilleService,
    private etablissementService: EtablissementService
  ) {
    this.reviewFormProprietaire = this.fb.group({
      rating: [null, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
      reservationIdForReview: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.isCurrentUserProprietaire = this.authService.isLoggedIn() && this.authService.isCurrentUserProprietaire();

    this.routeSub = this.route.paramMap.subscribe(params => {
      const etudiantIdParam = params.get('etudiantId');
      if (etudiantIdParam) {
        const etudiantId = +etudiantIdParam;
        if (!isNaN(etudiantId)) {
          this.loadAllData(etudiantId);
        } else {
          this.profilError = "ID d'??tudiant invalide dans l'URL.";
          this.isLoadingProfil = false;
        }
      } else {
        this.profilError = "Aucun ID d'??tudiant fourni dans l'URL.";
        this.isLoadingProfil = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.dataSub?.unsubscribe();
  }
  loadAllData(etudiantId: number): void {
    this.isLoadingProfil = true;
    this.isLoadingReviews = true;
    this.isLoadingAcademicInfo = false;
    this.profilError = null;
    this.reviewsError = null;
    this.etudiantProfil = null;
    this.reviewsPage = null;
    this.canLeaveReviewOnThisEtudiant = false;
    this.eligibleReservationsForReview = [];
    this.avisSoumisPourReservationIds.clear();

    this.dataSub?.unsubscribe();
    this.dataSub = forkJoin({
      profil: this.etudiantService.getEtudiantPublicProfil(etudiantId),
      reviews: this.reviewService.getAvisSurEtudiant(etudiantId, 0, this.reviewsPageSize)
    }).pipe(
      switchMap((results) => {
        // Créer le profil enrichi initial
        const profilEnrichi: EtudiantProfilEnrichi = {
          ...results.profil,
          villeNom: null,
          etablissementNom: null,
          isLoadingAcademicInfo: true
        };

        this.etudiantProfil = profilEnrichi;
        this.reviewsPage = results.reviews;
        this.currentReviewsPage = results.reviews.number;
        this.isLoadingReviews = false;
        this.isLoadingProfil = false;
        this.isLoadingAcademicInfo = true;

        // Déclencher la résolution des noms académiques
        return this.enrichirInformationsAcademiques(results.profil);
      }),
      finalize(() => {
        this.isLoadingProfil = false;
        this.isLoadingReviews = false;
        this.isLoadingAcademicInfo = false;
      })
    ).subscribe({
      next: (profilEnrichi) => {
        this.etudiantProfil = profilEnrichi;
        this.isLoadingAcademicInfo = false;

        if (this.isCurrentUserProprietaire && this.etudiantProfil) {
          this.checkIfProprietaireCanLeaveReview(this.etudiantProfil.id);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.profilError = err.message || "Impossible de charger le profil étudiant.";
        this.reviewsError = err.message || "Impossible de charger les avis pour cet étudiant.";
        this.isLoadingReviews = false;
        this.isLoadingAcademicInfo = false;
      }
    });
  }

  // Méthode pour enrichir les informations académiques
  private enrichirInformationsAcademiques(profil: EtudiantPublicProfilDTO): Observable<EtudiantProfilEnrichi> {
    // Helper pour parser les IDs
    const parseId = (value: string | null | undefined): number | null => {
      if (!value) return null;
      const num = parseInt(value, 10);
      return isNaN(num) ? null : num;
    };

    const villeId = parseId(profil.villeEtude);
    const etablissementId = parseId(profil.etablissement);

    // Observable pour récupérer le nom de la ville
    const villeNom$: Observable<string | null> = villeId !== null
      ? this.villeService.getVilleById(villeId).pipe(
          map(v => v?.nom || null),
          catchError(err => {
            console.warn(`Erreur lors de la récupération de la ville ID ${villeId}:`, err);
            return of(null);
          })
        )
      : of(typeof profil.villeEtude === 'string' && isNaN(parseInt(profil.villeEtude, 10)) ? profil.villeEtude : null);

    // Observable pour récupérer le nom de l'établissement
    const etablissementNom$: Observable<string | null> = etablissementId !== null
      ? this.etablissementService.getEtablissementById(etablissementId).pipe(
          map(e => e?.nom || null),
          catchError(err => {
            console.warn(`Erreur lors de la récupération de l'établissement ID ${etablissementId}:`, err);
            return of(null);
          })
        )
      : of(typeof profil.etablissement === 'string' && isNaN(parseInt(profil.etablissement, 10)) ? profil.etablissement : null);

    return forkJoin({
      villeNom: villeNom$,
      etablissementNom: etablissementNom$
    }).pipe(
      map(academicDetails => ({
        ...profil,
        villeNom: this.getDisplayValue(academicDetails.villeNom, profil.villeEtude, 'ville'),
        etablissementNom: this.getDisplayValue(academicDetails.etablissementNom, profil.etablissement, 'etablissement'),
        isLoadingAcademicInfo: false
      }))
    );
  }

  // Méthode helper pour formater l'affichage des valeurs
  private getDisplayValue(fetchedName: string | null, originalValue: string | null | undefined, type: 'ville' | 'etablissement'): string {
    const defaultValue = type === 'ville' ? 'Non renseignée' : 'Non renseigné';
    
    if (fetchedName) {
      return fetchedName;
    }
    
    if (!originalValue) {
      return defaultValue;
    }
    
    // Si la valeur originale n'est pas un ID numérique, l'utiliser directement
    if (isNaN(parseInt(originalValue, 10))) {
      return originalValue;
    }
    
    // Si c'est un ID mais qu'on n'a pas pu récupérer le nom
    return `Information non disponible (ID: ${originalValue})`;
  }

  checkIfProprietaireCanLeaveReview(etudiantCibleId: number): void {
    if (!this.isCurrentUserProprietaire) return;

    this.reviewService.getReservationIdsEligiblesPourAvis(etudiantCibleId, 'PROPRIETAIRE_SUR_ETUDIANT')
      .subscribe({
        next: (reservationIds: number[]) => {
          if (reservationIds && reservationIds.length > 0) {
            // Pour la d??mo, on cr??e une description simple. Id??alement, le backend fournirait plus de contexte.
            this.eligibleReservationsForReview = reservationIds.map(id => ({
                id: id,
                description: `Location termin??e (ID R??sa: ${id})` // Placeholder
                // logementAdresse: 'Adresse du logement li?? ?? cette r??sa' // N??cessiterait un appel suppl??mentaire ou plus d'infos du backend
            }));
            this.canLeaveReviewOnThisEtudiant = this.eligibleReservationsForReview.some(
              resa => !this.avisSoumisPourReservationIds.has(resa.id)
            );
          } else {
            this.canLeaveReviewOnThisEtudiant = false;
            this.eligibleReservationsForReview = [];
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error("Erreur v??rification ??ligibilit?? avis propri??taire:", err);
          this.canLeaveReviewOnThisEtudiant = false;
          this.eligibleReservationsForReview = [];
        }
      });
  }

  toggleProprietaireReviewForm(): void {
    this.showReviewForm = !this.showReviewForm;
    this.reviewSubmissionError = null;
    if (this.showReviewForm) {
      this.reviewFormProprietaire.reset();
      const firstEligibleNotReviewed = this.eligibleReservationsForReview.find(
        resa => !this.avisSoumisPourReservationIds.has(resa.id)
      );
      if (firstEligibleNotReviewed) {
        this.reviewFormProprietaire.patchValue({ reservationIdForReview: firstEligibleNotReviewed.id });
      }
    }
  }

  onSubmitProprietaireReview(): void {
    if (!this.reviewFormProprietaire.valid) {
      this.reviewSubmissionError = "Veuillez noter, commenter et s??lectionner une r??servation.";
      this.reviewFormProprietaire.markAllAsTouched();
      return;
    }
    if (!this.etudiantProfil) {
      this.reviewSubmissionError = "Profil de l'??tudiant non charg??.";
      return;
    }

    this.isSubmittingReview = true;
    this.reviewSubmissionError = null;
    const selectedReservationId = this.reviewFormProprietaire.value.reservationIdForReview;

    const payload: ReviewCreationPayload = {
      reservationId: selectedReservationId,
      rating: this.reviewFormProprietaire.value.rating,
      comment: this.reviewFormProprietaire.value.comment,
      type: 'PROPRIETAIRE_SUR_ETUDIANT'
    };

    this.reviewService.creerAvis(payload)
      .pipe(finalize(() => this.isSubmittingReview = false))
      .subscribe({
        next: () => {
          alert('Avis sur l\'??tudiant soumis avec succ??s !');
          this.showReviewForm = false;
          this.avisSoumisPourReservationIds.add(selectedReservationId);

          this.canLeaveReviewOnThisEtudiant = this.eligibleReservationsForReview.some(
            resa => !this.avisSoumisPourReservationIds.has(resa.id)
          );
          
          if (this.etudiantProfil) {
            this.loadReviewsForEtudiant(this.etudiantProfil.id, 0);
             const currentReviewCount = this.etudiantProfil.reviewCountFromProprietaires || 0;
             this.etudiantProfil.reviewCountFromProprietaires = currentReviewCount + 1;
             // Recalculer la moyenne n??cessiterait de conna??tre toutes les notes ou de la recevoir du backend
             // Pour la d??mo, on peut la laisser ou indiquer qu'elle sera mise ?? jour au prochain rechargement.
          }
          this.cdr.detectChanges();
        },
        error: (err: Error) => {
          this.reviewSubmissionError = err.message || "Erreur lors de la soumission de l'avis.";
          alert(this.reviewSubmissionError);
        }
      });
  }

  loadReviewsForEtudiant(etudiantId: number, page: number): void {
    this.isLoadingReviews = true;
    this.reviewsError = null;
    this.reviewService.getAvisSurEtudiant(etudiantId, page, this.reviewsPageSize)
      .pipe(finalize(() => {
        this.isLoadingReviews = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (pageData) => {
          this.reviewsPage = pageData;
          this.currentReviewsPage = page;
        },
        error: (err) => {
          this.reviewsError = err.message || 'Impossible de charger cette page d\'avis.';
        }
      });
  }

  goToReviewsPage(pageNumber: number): void {
    if (this.etudiantProfil?.id && pageNumber >= 0 && (!this.reviewsPage || pageNumber < this.reviewsPage.totalPages)) {
      this.loadReviewsForEtudiant(this.etudiantProfil.id, pageNumber);
    }
  }

  getReviewPagesArray(): number[] {
    if (!this.reviewsPage || this.reviewsPage.totalPages <= 1) {
      return [];
    }
    return Array(this.reviewsPage.totalPages).fill(0).map((x, i) => i);
  }

  getAvatarUrl(avatarIdentifier?: string | null): string {
    const placeholder = 'assets/images/avatar-placeholder.png';
    if (!avatarIdentifier) { return placeholder; }
    if (avatarIdentifier.startsWith('http://') || avatarIdentifier.startsWith('https://') || avatarIdentifier.startsWith('assets/')) {
      return avatarIdentifier;
    }
    return `${this.imageBaseUrl}${avatarIdentifier}`;
  }

  getReviewerAvatarUrl(avatarIdentifier?: string | null): string {
    return this.getAvatarUrl(avatarIdentifier);
  }

  goBack(): void {
    this.router.navigate(['/proprietaire/demandes']);
  }

  // Getter pour le template (pour les noms de champs longs)
  get reservationIdForReviewControl() {
    return this.reviewFormProprietaire.get('reservationIdForReview');
  }
  get ratingControl() {
    return this.reviewFormProprietaire.get('rating');
  }
  get commentControl() {
    return this.reviewFormProprietaire.get('comment');
  }

  // Getters pour améliorer l'affichage dans le template
  get villeDisplay(): string {
    if (!this.etudiantProfil) return 'Non renseignée';
    
    if (this.isLoadingAcademicInfo) {
      return 'Chargement...';
    }
    
    return this.etudiantProfil.villeNom || 'Non renseignée';
  }

  get etablissementDisplay(): string {
    if (!this.etudiantProfil) return 'Non renseigné';
    
    if (this.isLoadingAcademicInfo) {
      return 'Chargement...';
    }
    
    return this.etudiantProfil.etablissementNom || 'Non renseigné';
  }

  get hasAcademicInfo(): boolean {
    if (!this.etudiantProfil) return false;
    
    return !!(
      this.etudiantProfil.villeNom || 
      this.etudiantProfil.etablissementNom || 
      this.etudiantProfil.filiere || 
      this.etudiantProfil.anneeEtude
    );
  }

  get isVilleResolved(): boolean {
    return this.etudiantProfil?.villeNom !== null && 
           this.etudiantProfil?.villeNom !== 'Non renseignée' &&
           !this.etudiantProfil?.villeNom?.includes('Information non disponible');
  }

  get isEtablissementResolved(): boolean {
    return this.etudiantProfil?.etablissementNom !== null && 
           this.etudiantProfil?.etablissementNom !== 'Non renseigné' &&
           !this.etudiantProfil?.etablissementNom?.includes('Information non disponible');
  }
}