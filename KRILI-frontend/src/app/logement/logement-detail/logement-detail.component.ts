// src/app/logement/logement-detail/logement-detail.component.ts
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subscription, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { LogementService, FavoriteStatus } from '../logement.service';
import { LogementDTO } from '../logement.dto';
import { AuthService } from '../../auth/auth.service';
import { ReviewService } from '../../shared/review.service';
import { ReviewDTO, Page, ReviewCreationPayload, ReviewType } from '../../models/review.dto';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl } from '@angular/forms';
import { ReservationService, DemandeReservationPayload, ReservationResponse, ReservationDateRange } from '../../shared/reservation.service'; // Import du service de réservation

import * as L from 'leaflet';
import flatpickr from 'flatpickr';
import { French } from 'flatpickr/dist/l10n/fr.js';

// Validateur pour s'assurer que dateFin > dateDebut
export const dateRangeValidator: ValidatorFn = (control: AbstractControl): { [key: string]: any } | null => {
  const dateDebutControl = control.get('dateDebut');
  const dateFinControl = control.get('dateFin');

  if (!dateDebutControl || !dateFinControl || !dateDebutControl.value || !dateFinControl.value) {
    return null; // Ne pas valider si les champs ne sont pas remplis
  }
  const dateDebut = new Date(dateDebutControl.value);
  const dateFin = new Date(dateFinControl.value);

  return dateFin > dateDebut ? null : { dateRangeInvalid: true };
};

@Component({
  selector: 'app-logement-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './logement-detail.component.html',
  styleUrls: ['./logement-detail.component.css']
})
export class LogementDetailComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('mapDetailContainer') private mapContainer!: ElementRef;
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private readonly DEFAULT_MAP_ZOOM = 15;

  logement: LogementDTO | null = null;
  isLoading: boolean = true;
  errorMessage: string | null = null;
  selectedImageIndex: number = 0;
  isFavorite: boolean = false;
  isFavoriteLoading: boolean = false;
  isCheckingFavoriteStatus: boolean = false;
  isCurrentUserEtudiant: boolean = false;

  private routeSub: Subscription | undefined;
  private dataSub: Subscription | undefined;
  private favStatusSub: Subscription | undefined;
  private favActionSub: Subscription | undefined;

  // Review properties (existantes)
  reviewsPage: Page<ReviewDTO> | null = null;
  isLoadingReviews = false;
  reviewsErrorMessage: string | null = null;
  currentReviewsPage = 0;
  reviewsPageSize = 3;
  canLeaveReviewLogement = false;
  canLeaveReviewProprietaire = false;
  eligibleReservationIdsForLogementReview: number[] = [];
  eligibleReservationIdsForProprietaireReview: number[] = [];
  showReviewFormType: ReviewType | null = null;
  reviewForm: FormGroup;
  isSubmittingReview = false;
  reviewSubmissionError: string | null = null;
  private reviewsSub: Subscription = new Subscription();

  // Propri??t??s pour le formulaire de demande de r??servation (NOUVEAU)
  showDemandeForm = false;
  demandeForm: FormGroup;
  isSubmittingDemande = false;
  demandeSuccessMessage: string | null = null;
  demandeErrorMessage: string | null = null;
  demandeDejaEnvoyee = false;

  private flatpickrDebutInstance: any = null;
  private flatpickrFinInstance: any = null;
  private confirmedReservationsDates: ReservationDateRange[] = [];
  private myPendingReservationsDates: ReservationDateRange[] = [];

  Math = Math;
  public routerInstance: Router;


  constructor(
    private route: ActivatedRoute,
    private logementService: LogementService,
    public router: Router, // Rendu public pour acc??s depuis le template
    private authService: AuthService,
    private reviewService: ReviewService,
    private fb: FormBuilder,
    private reservationService: ReservationService // Injection du nouveau service
  ) {
    this.routerInstance = this.router; // Initialize routerInstance here
    // Formulaire pour les avis (existant)
    this.reviewForm = this.fb.group({
      rating: [null, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]]
    });

    // Formulaire pour la demande de r??servation (NOUVEAU)
    this.demandeForm = this.fb.group({
      dateDebut: ['', [Validators.required]],
      dateFin: ['', [Validators.required]],
      message: ['', [Validators.maxLength(500)]]
    }, { validators: dateRangeValidator });
  }

  ngOnInit(): void {
    this.isCurrentUserEtudiant = this.authService.isLoggedIn() && !this.authService.isCurrentUserProprietaire();
    this.routeSub = this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const logementId = +idParam;
        if (!isNaN(logementId)) {
          this.loadLogementDetails(logementId);
        } else {
          this.handleInvalidId(`ID de logement invalide: '${idParam}'.`);
        }
      } else {
        this.handleInvalidId("Aucun ID de logement fourni dans l'URL.");
      }
    });
  }

  ngAfterViewInit(): void {
    // La carte est initialis??e dans loadLogementDetails apr??s r??cup??ration des donn??es
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.dataSub?.unsubscribe();
    this.favStatusSub?.unsubscribe();
    this.favActionSub?.unsubscribe();
    this.reviewsSub?.unsubscribe();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.destroyFlatpickrInstances();
  }

  loadLogementDetails(id: number): void {
    this.isLoading = true; this.errorMessage = null; this.logement = null;
    this.selectedImageIndex = 0; this.isFavorite = false; this.isFavoriteLoading = false; this.isCheckingFavoriteStatus = false;
    this.reviewsPage = null; this.isLoadingReviews = false; this.reviewsErrorMessage = null; this.currentReviewsPage = 0;
    this.canLeaveReviewLogement = false; this.canLeaveReviewProprietaire = false;
    this.eligibleReservationIdsForLogementReview = []; this.eligibleReservationIdsForProprietaireReview = [];
    this.showReviewFormType = null;
    // R??initialisation des ??tats de demande de r??servation
    this.showDemandeForm = false;
    this.demandeSuccessMessage = null;
    this.demandeErrorMessage = null;
    this.demandeDejaEnvoyee = false; // Important pour permettre une nouvelle demande sur un autre logement
    this.demandeForm.reset();

    if (this.map) { this.map.remove(); this.map = null; this.marker = null; }
    this.destroyFlatpickrInstances(); // Destroy before loading new data

    this.dataSub?.unsubscribe();
    this.dataSub = this.logementService.getLogementById(id).subscribe({
      next: (data) => {
        this.logement = data;
        this.isLoading = false;
        if (this.isCurrentUserEtudiant && this.logement?.id) {
          this.checkFavoriteStatus(this.logement.id);
          this.checkIfCanLeaveReview(this.logement.id);
          // Optionnel: V??rifier si une demande est d??j?? en cours pour ce logement
          // this.checkExistingPendingReservation(this.logement.id);
          this.loadDisabledDatesForCalendar(this.logement.id); // Load dates for Flatpickr
        }
        if (this.logement?.id) { this.loadReviewsForLogement(this.logement.id, 0); }
        setTimeout(() => { this.initMapForDisplay(); }, 0);
      },
      error: (err) => {
        this.errorMessage = err.message || `Impossible de charger le logement (ID: ${id}).`;
        this.isLoading = false;
      }
    });
  }

  private initMapForDisplay(): void {
    if (this.mapContainer && this.logement && typeof this.logement.latitude === 'number' && typeof this.logement.longitude === 'number') {
      if (this.map) { this.map.remove(); this.map = null; }
      const lat = this.logement.latitude;
      const lon = this.logement.longitude;
      this.map = L.map(this.mapContainer.nativeElement).setView([lat, lon], this.DEFAULT_MAP_ZOOM);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', minZoom: 3 }).addTo(this.map);
      const customIcon = L.divIcon({ html: '<i class="fas fa-home fa-2x" style="color: orange;"></i>', className: 'custom-leaflet-icon-detail', iconSize: [30, 30], iconAnchor: [15, 30] });
      this.marker = L.marker([lat, lon], { icon: customIcon }).addTo(this.map);
      setTimeout(() => { this.map?.invalidateSize(); }, 100);
    } else {
      console.log('Carte non initialis??e: pas de coordonn??es valides ou conteneur non pr??t.');
    }
  }

  checkFavoriteStatus(logementId: number): void {
    if (!this.isCurrentUserEtudiant) return;
    this.isCheckingFavoriteStatus = true;
    this.favStatusSub?.unsubscribe();
    this.favStatusSub = this.logementService.checkFavoriteStatus(logementId).pipe(
        finalize(() => this.isCheckingFavoriteStatus = false)
    ).subscribe({
        next: (status: FavoriteStatus) => this.isFavorite = status.isFavorite,
        error: (err) => { if (err.status !== 401 && err.status !== 403) { console.warn(`Erreur statut favori:`, err.message); } this.isFavorite = false; }
    });
  }

  toggleFavorite(): void {
    if (!this.logement?.id || !this.isCurrentUserEtudiant || this.isFavoriteLoading || this.isCheckingFavoriteStatus) return;
    this.isFavoriteLoading = true; const logementId = this.logement.id;
    const action$: Observable<void> = this.isFavorite ? this.logementService.removeFromFavorites(logementId) : this.logementService.addToFavorites(logementId);
    this.favActionSub?.unsubscribe();
    this.favActionSub = action$.pipe(finalize(() => this.isFavoriteLoading = false))
    .subscribe({ next: () => this.isFavorite = !this.isFavorite, error: (err: any) => alert(err.message || "Erreur mise ?? jour favoris.") });
  }

  handleInvalidId(message: string): void {
    this.errorMessage = message + " Redirection..."; this.isLoading = false;
    setTimeout(() => this.router.navigate(['/annonces']), 3000);
  }

  selectImage(index: number): void { if (this.logement?.photos && index >= 0 && index < this.logement.photos.length) { this.selectedImageIndex = index; }}
  nextImage(): void { if (this.logement?.photos && this.logement.photos.length > 1) { this.selectedImageIndex = (this.selectedImageIndex + 1) % this.logement.photos.length; }}
  prevImage(): void { if (this.logement?.photos && this.logement.photos.length > 1) { this.selectedImageIndex = (this.selectedImageIndex - 1 + this.logement.photos.length) % this.logement.photos.length; }}

  reserveLogement(): void {
    if (!this.logement || this.logement.statut !== 'ACTIVE' || !this.isCurrentUserEtudiant) return;
    this.toggleDemandeForm();
  }

  shareLogement(): void {
    if (!this.logement || !this.logement.adresseLigne1) return;
    const shareData = { title: `${this.logement.type} - ${this.logement.adresseLigne1}`, text: `D??couvrez ce logement sur KRILI: ${this.logement.adresseLigne1}`, url: window.location.href };
    if (navigator.share) { navigator.share(shareData).catch((error) => console.log('Erreur Web Share API', error)); }
    else { navigator.clipboard.writeText(shareData.url).then(() => alert('Lien copi?? !')).catch(() => alert('Impossible de copier: ' + shareData.url)); }
  }

  getImageUrl(photoIdentifier: string | undefined | null): string {
    const placeholder = 'https://via.placeholder.com/600x400/E5E7EB/9CA3AF?text=Image+Indisponible';
    const imageBaseUrl = 'http://localhost:8088/api/images/';
    if (!photoIdentifier) { return placeholder; }
    if (photoIdentifier.startsWith('http')) { return photoIdentifier; }
    return `${imageBaseUrl}${photoIdentifier}`;
  }

  getEquipmentIcon(key: string | undefined | null): string {
    if (!key) return 'fas fa-question-circle text-gray-400';
    const keyLower = key.toLowerCase().trim();
    if (keyLower.includes('wifi')) return 'fas fa-wifi text-blue-500';
    if (keyLower.includes('clim')) return 'fas fa-snowflake text-cyan-500';
    if (keyLower.includes('chauffage')) return 'fas fa-fire text-orange-500';
    if (keyLower.includes('lave-linge') || keyLower.includes('machine ?? laver')) return 'fas fa-washer text-indigo-500';
    if (keyLower.includes('cuisine')) return 'fas fa-utensils text-yellow-600';
    if (keyLower.includes('tv') || keyLower.includes('t??l??vision')) return 'fas fa-tv text-purple-500';
    if (keyLower.includes('parking')) return 'fas fa-parking text-gray-600';
    if (keyLower.includes('balcon') || keyLower.includes('terrasse')) return 'fas fa-border-all text-green-500';
    if (keyLower.includes('jardin')) return 'fas fa-tree text-green-600';
    if (keyLower.includes('travail') || keyLower.includes('bureau')) return 'fas fa-desktop text-blue-600';
    if (keyLower.includes('s??curit') || keyLower.includes('alarme')) return 'fas fa-shield-alt text-red-500';
    if (keyLower.includes('bain priv')) return 'fas fa-bath text-teal-500';
    if (keyLower.includes('salon')) return 'fas fa-couch text-pink-500';
    return 'fas fa-check-circle text-green-500';
  }

  getStatutLibelle(statut: string | undefined | null): string {
    if (!statut) return 'Inconnu';
    switch (statut.toUpperCase()) {
      case 'ACTIVE': return 'Disponible';
      case 'BROUILLON': return 'Brouillon (non visible)';
      case 'RESERVEE': return 'R??serv??';
      case 'LOUEE': return 'Lou??';
      case 'ARCHIVEE': return 'Archiv??';
      default: return statut;
    }
  }

  getBadgeText(badgeKey: string | undefined | null): string {
    if (!badgeKey) return '';
    switch (badgeKey) {
      case 'BADGE_PREMIUM': return 'Premium';
      case 'BADGE_ULTIMATE': return 'Ultimate';
      case 'BADGE_NOUVEAUTE': return 'nouveaut??';
      default: return badgeKey.replace('BADGE_', '').replace('_', ' ');
    }
  }

  getBadgeIcon(badgeKey: string | undefined | null): string {
    if (!badgeKey) return 'fas fa-tag';
    switch (badgeKey) {
      case 'BADGE_PREMIUM': return 'fas fa-star';
      case 'BADGE_ULTIMATE': return 'fas fa-rocket';
      case 'BADGE_NOUVEAUTE': return 'fas fa-magic';
      default: return 'fas fa-tag';
    }
  }

  getBadgeSpecificClass(badgeKey: string | undefined | null): string {
    if (!badgeKey) return '';
    switch (badgeKey) {
      case 'BADGE_PREMIUM': return 'badge-style-premium';
      case 'BADGE_ULTIMATE': return 'badge-style-ultimate';
      case 'BADGE_NOUVEAUTE': return 'badge-style-nouveaute';
      default: return 'badge-style-default';
    }
  }

  loadReviewsForLogement(logementId: number, page: number): void {
    this.isLoadingReviews = true; this.reviewsErrorMessage = null; this.reviewsSub?.unsubscribe();
    this.reviewsSub = this.reviewService.getAvisSurLogement(logementId, page, this.reviewsPageSize)
      .pipe(finalize(() => this.isLoadingReviews = false))
      .subscribe({ next: (pageData) => { this.reviewsPage = pageData; this.currentReviewsPage = page; }, error: (err) => { this.reviewsErrorMessage = err.message || 'Impossible de charger les avis.'; } });
  }

  checkIfCanLeaveReview(logementId: number): void {
    if (!this.isCurrentUserEtudiant) return;
    this.reviewService.getReservationIdsEligiblesPourAvis(logementId, 'ETUDIANT_SUR_LOGEMENT').subscribe({ next: (ids) => { if (ids && ids.length > 0) { this.canLeaveReviewLogement = true; this.eligibleReservationIdsForLogementReview = ids; } } });
    if (this.logement?.proprietaireId) { this.reviewService.getReservationIdsEligiblesPourAvis(this.logement.proprietaireId, 'ETUDIANT_SUR_PROPRIETAIRE').subscribe({ next: (ids) => { if (ids && ids.length > 0) { this.canLeaveReviewProprietaire = true; this.eligibleReservationIdsForProprietaireReview = ids; } } }); }
  }

  toggleReviewForm(type: ReviewType | null): void { if (type) { this.reviewForm.reset(); } this.showReviewFormType = type; this.reviewSubmissionError = null; }

  onSubmitReview(avisTypeCible: ReviewType): void {
    if (!this.reviewForm.valid || !this.showReviewFormType) { this.reviewSubmissionError = "Veuillez corriger les erreurs du formulaire."; return; }
    this.isSubmittingReview = true; this.reviewSubmissionError = null;
    let reservationId: number | undefined;
    if (avisTypeCible === 'ETUDIANT_SUR_LOGEMENT') { reservationId = this.eligibleReservationIdsForLogementReview[0]; }
    else if (avisTypeCible === 'ETUDIANT_SUR_PROPRIETAIRE') { reservationId = this.eligibleReservationIdsForProprietaireReview[0]; }
    if (!reservationId) { this.reviewSubmissionError = "Aucune r??servation ??ligible trouv??e pour cet avis."; this.isSubmittingReview = false; return; }
    const payload: ReviewCreationPayload = { reservationId: reservationId, rating: this.reviewForm.value.rating, comment: this.reviewForm.value.comment, type: avisTypeCible };
    this.reviewService.creerAvis(payload).pipe(finalize(() => this.isSubmittingReview = false))
      .subscribe({ next: () => { this.toggleReviewForm(null); alert('Avis soumis avec succ??s !'); if (this.logement?.id) { this.loadLogementDetails(this.logement.id); } }, error: (err) => { this.reviewSubmissionError = err.message || "Erreur lors de la soumission de l'avis."; } });
  }

  goToReviewsPage(pageNumber: number): void { if (this.logement?.id && pageNumber >= 0 && (!this.reviewsPage || pageNumber < this.reviewsPage.totalPages)) { this.loadReviewsForLogement(this.logement.id, pageNumber); } }
  getReviewPagesArray(): number[] { if (!this.reviewsPage || this.reviewsPage.totalPages <= 1) { return []; } return Array(this.reviewsPage.totalPages).fill(0).map((x, i) => i); }
  getReviewerAvatarUrl(avatarIdentifier?: string | null): string {
    const placeholder = 'assets/images/avatar-placeholder.png';
    const imageBaseUrl = 'http://localhost:8088/api/images/';
    if (!avatarIdentifier) { return placeholder; }
    if (avatarIdentifier.startsWith('http')) { return avatarIdentifier; }
    return `${imageBaseUrl}${avatarIdentifier}`;
  }

  toggleDemandeForm(): void {
    this.showDemandeForm = !this.showDemandeForm;
    this.demandeSuccessMessage = null;
    this.demandeErrorMessage = null;
    if (this.showDemandeForm) {
      this.demandeForm.reset();
      // Default dates are set here, Flatpickr will pick them up or override
      const today = new Date();
      const defaultStartDate = new Date(new Date().setDate(today.getDate() + 1)); // Tomorrow
      const defaultEndDate = new Date(new Date().setDate(today.getDate() + 8)); // A week from tomorrow

      this.demandeForm.patchValue({
        dateDebut: defaultStartDate.toISOString().split('T')[0],
        dateFin: defaultEndDate.toISOString().split('T')[0]
      });
      // Initialize Flatpickr instances when the form becomes visible
      // Ensure this is called after the view is updated and elements are available
      setTimeout(() => this.initFlatpickr(), 0);
    } else {
      this.destroyFlatpickrInstances();
    }
  }

  get dateDebut() { return this.demandeForm.get('dateDebut'); }
  get dateFin() { return this.demandeForm.get('dateFin'); }

  onDateDebutChange(): void {
    const dateDebutValue = this.dateDebut?.value;
    const dateFinValue = this.dateFin?.value;
    if (dateDebutValue && dateFinValue) {
      const startDate = new Date(dateDebutValue);
      const endDate = new Date(dateFinValue);
      if (endDate <= startDate) {
        const newEndDate = new Date(startDate);
        newEndDate.setDate(startDate.getDate() + 1);
        this.dateFin?.setValue(newEndDate.toISOString().split('T')[0]);
      }
    }
    // Update Flatpickr end date minDate if start date changes
    if (this.flatpickrFinInstance && dateDebutValue) {
      this.flatpickrFinInstance.set('minDate', new Date(new Date(dateDebutValue).getTime() + 24 * 60 * 60 * 1000));
    }
    this.demandeForm.updateValueAndValidity();
  }
  
  onDateFinChange(): void {
    this.demandeForm.updateValueAndValidity();
  }

  onSubmitDemande(): void {
    if (this.demandeForm.invalid || !this.logement || !this.logement.id) {
      this.demandeForm.markAllAsTouched();
      if (this.demandeForm.errors?.['dateRangeInvalid']) {
        this.demandeErrorMessage = "La date de fin doit ??tre post??rieure ?? la date de d??but.";
      } else {
        this.demandeErrorMessage = "Veuillez corriger les erreurs dans le formulaire.";
      }
      return;
    }

    this.isSubmittingDemande = true;
    this.demandeErrorMessage = null;
    this.demandeSuccessMessage = null;

    const payload: DemandeReservationPayload = {
      logementId: this.logement.id,
      dateDebut: this.demandeForm.value.dateDebut,
      dateFin: this.demandeForm.value.dateFin,
      message: this.demandeForm.value.message || undefined
    };

    this.reservationService.creerDemandeReservation(payload)
      .pipe(finalize(() => this.isSubmittingDemande = false))
      .subscribe({
        next: (response: ReservationResponse) => {
          this.demandeSuccessMessage = response.message || "Votre demande de r??servation a ??t?? envoy??e avec succ??s !";
          this.showDemandeForm = false;
          this.demandeDejaEnvoyee = true;
        },
        error: (err: Error) => {
          this.demandeErrorMessage = err.message || "Une erreur est survenue lors de l'envoi de votre demande.";
        }
      });
  }

  getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  getMinEndDate(): string {
    if (this.dateDebut?.value) {
      const startDate = new Date(this.dateDebut.value);
      startDate.setDate(startDate.getDate() + 1);
      return startDate.toISOString().split('T')[0];
    }
    // Default to tomorrow if dateDebut is not set (should be handled by Flatpickr minDate too)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  // --- Flatpickr Specific Methods ---
  
  private loadDisabledDatesForCalendar(logementId: number): void {
    // Reset the current dates arrays
    this.confirmedReservationsDates = [];
    this.myPendingReservationsDates = [];
    
    // Track loading state for both API calls
    let isLoadingConfirmed = true;
    let isLoadingPending = this.isCurrentUserEtudiant;
    
    // Helper function to initialize flatpickr when all data is loaded
    const initFlatpickrWhenReady = () => {
      if (!isLoadingConfirmed && !isLoadingPending && this.showDemandeForm) {
        this.initFlatpickr();
      }
    };
    
    // Fetch confirmed reservations (disabled for everyone) 
    // Ces dates sont bloquées pour tous les utilisateurs car elles correspondent à des réservations confirmées
    this.reservationService.getConfirmedReservationDates(logementId).subscribe({
      next: (dates) => {
        this.confirmedReservationsDates = dates;
        isLoadingConfirmed = false;
        initFlatpickrWhenReady();
      },
      error: (err) => {
        console.error('Error fetching confirmed reservation dates:', err);
        this.demandeErrorMessage = 'Impossible de récupérer les dates indisponibles. Certaines dates pourraient ne pas être sélectionnables.';
        isLoadingConfirmed = false;
        initFlatpickrWhenReady();
      }
    });

    // Fetch pending reservations for the current user only
    // Note: Les demandes en attente sont désactivées UNIQUEMENT pour l'utilisateur connecté
    // Les autres étudiants peuvent toujours faire des demandes pour ces mêmes dates
    if (this.isCurrentUserEtudiant) {
      this.reservationService.getMyPendingReservationDatesForLogement(logementId).subscribe({
        next: (dates) => {
          // Ces dates sont désactivées uniquement pour l'étudiant courant
          this.myPendingReservationsDates = dates;
          isLoadingPending = false;
          initFlatpickrWhenReady();
        },
        error: (err) => {
          console.error('Error fetching pending reservation dates:', err);
          this.demandeErrorMessage = 'Impossible de récupérer vos demandes en attente. Certaines dates pourraient ne pas être affichées correctement.';
          isLoadingPending = false;
          initFlatpickrWhenReady();
        }
      });
    } else {
      isLoadingPending = false;
    }
  }
  private initFlatpickr(): void {
    this.destroyFlatpickrInstances(); // Ensure old instances are cleaned up

    const dateDebutElement = document.getElementById('dateDebut');
    const dateFinElement = document.getElementById('dateFin');

    if (!dateDebutElement || !dateFinElement) {
      console.warn('Flatpickr target elements not found in the DOM yet.');
      return;
    }    // Pour les dates confirmées (réservations acceptées), elles sont désactivées pour tous les utilisateurs
    const confirmedDisabledDates = this.confirmedReservationsDates.map(range => ({
      from: range.from,
      to: range.to
    }));
    
    // Pour les dates en attente, elles sont désactivées uniquement pour l'étudiant actuel qui a déjà fait une demande
    const userPendingDates = this.myPendingReservationsDates.map(range => ({
      from: range.from,
      to: range.to
    }));
    
    // Combine les deux types de dates désactivées
    const combinedDisabledDates = [
      ...confirmedDisabledDates,
      ...userPendingDates
    ];

    // Common Flatpickr options - Airbnb-inspired styling
    const flatpickrOptions: any = {
      // Basic functionality
      altInput: true,
      altFormat: 'j F Y', // Format displayed to user: Day Month Year
      dateFormat: 'Y-m-d', // Format for form value
      minDate: 'today',
      locale: French,
      disable: combinedDisabledDates,
      disableMobile: false, // Use custom UI even on mobile devices
      
      // Position the calendar properly to fix z-index issues
      appendTo: document.body,
      static: true,
      
      // Custom styling
      onReady: (selectedDates: Date[], dateStr: string, instance: any) => {
        // Add custom classes for styling
        instance.calendarContainer.classList.add('krili-flatpickr-airbnb-theme');
        
        // Fix z-index issue
        instance.calendarContainer.style.zIndex = '9999';
        
        // Add animation for a smoother appearance
        setTimeout(() => {
          instance.calendarContainer.style.opacity = '1';
          instance.calendarContainer.style.transform = 'translateY(0)';
        }, 0);
      }
    };

    // Initialize start date picker with specific options
    this.flatpickrDebutInstance = flatpickr(dateDebutElement, {
      ...flatpickrOptions,
      defaultDate: this.demandeForm.get('dateDebut')?.value || undefined,
      onChange: (selectedDates: Date[], dateStr: string, instance: any) => {
        // Update form value
        this.demandeForm.patchValue({ dateDebut: dateStr });
        
        // Update end date constraints if a start date is selected
        if (selectedDates[0] && this.flatpickrFinInstance) {
          // Set minimum end date to day after selected start date
          const nextDay = new Date(selectedDates[0].getTime() + 24 * 60 * 60 * 1000);
          this.flatpickrFinInstance.set('minDate', nextDay);
          
          // If current end date is before or equal to new start date, clear it
          const currentFinVal = this.demandeForm.get('dateFin')?.value;
          if (currentFinVal && new Date(currentFinVal) <= selectedDates[0]) {
            this.demandeForm.patchValue({ dateFin: '' });
            this.flatpickrFinInstance.clear();
          }
        }
        
        this.onDateDebutChange();
      }
    });

    // Calculate initial minimum end date
    const initialMinEndDate = this.demandeForm.get('dateDebut')?.value 
      ? new Date(new Date(this.demandeForm.get('dateDebut')?.value).getTime() + 24*60*60*1000)
      : new Date(new Date().setDate(new Date().getDate() + 1));

    // Initialize end date picker with specific options
    this.flatpickrFinInstance = flatpickr(dateFinElement, {
      ...flatpickrOptions,
      minDate: initialMinEndDate,
      defaultDate: this.demandeForm.get('dateFin')?.value || undefined,
      onChange: (selectedDates: Date[], dateStr: string, instance: any) => {
        // Update form value
        this.demandeForm.patchValue({ dateFin: dateStr });
        this.onDateFinChange();
      }
    });
    
    // Add focus/blur event listeners for better UX
    dateDebutElement.addEventListener('focus', () => {
      if (this.flatpickrDebutInstance) {
        this.flatpickrDebutInstance.open();
      }
    });
    
    dateFinElement.addEventListener('focus', () => {
      if (this.flatpickrFinInstance) {
        this.flatpickrFinInstance.open();
      }
    });
  }
  private destroyFlatpickrInstances(): void {
    // Clean up start date picker
    if (this.flatpickrDebutInstance) {
      try {
        // Remove any event listeners before destroying
        const dateDebutElement = document.getElementById('dateDebut');
        if (dateDebutElement) {
          const newElement = dateDebutElement.cloneNode(true);
          if (dateDebutElement.parentNode) {
            dateDebutElement.parentNode.replaceChild(newElement, dateDebutElement);
          }
        }
        this.flatpickrDebutInstance.destroy();
      } catch (e) {
        console.warn('Error destroying start date flatpickr instance:', e);
      } finally {
        this.flatpickrDebutInstance = null;
      }
    }
    
    // Clean up end date picker
    if (this.flatpickrFinInstance) {
      try {
        // Remove any event listeners before destroying
        const dateFinElement = document.getElementById('dateFin');
        if (dateFinElement) {
          const newElement = dateFinElement.cloneNode(true);
          if (dateFinElement.parentNode) {
            dateFinElement.parentNode.replaceChild(newElement, dateFinElement);
          }
        }
        this.flatpickrFinInstance.destroy();
      } catch (e) {
        console.warn('Error destroying end date flatpickr instance:', e);
      } finally {
        this.flatpickrFinInstance = null;
      }
    }
    
    // Remove any orphaned flatpickr containers from the DOM
    const orphanedCalendars = document.querySelectorAll('.flatpickr-calendar:not(.open):not(.inline)');
    orphanedCalendars.forEach(calendar => {
      if (calendar.parentNode) {
        calendar.parentNode.removeChild(calendar);
      }
    });
  }
}