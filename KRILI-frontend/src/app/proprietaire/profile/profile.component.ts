// krili-frontend/src/app/proprietaire/profile/profile.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs';
import { ProprietaireService, ProprietaireDetailsDTO, SubscriptionStatus } from '../proprietaire.service';
import { LogementDTO } from '../../logement/logement.dto';
import { AuthService } from '../../auth/auth.service';
import { ReviewService } from '../../shared/review.service';
import { ReviewDTO, Page } from '../../models/review.dto';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {

  proprietaire: ProprietaireDetailsDTO | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  // --- AJOUTS POUR L'ABONNEMENT ---
  isSubscribed: boolean = false;           // État de l'abonnement
  isSubscriptionLoading: boolean = false;  // Chargement pendant l'action
  isCheckingSubscription: boolean = false; // Chargement pendant la vérification initiale
  isCurrentUserEtudiant: boolean = false;  // L'utilisateur est-il étudiant ?
  // --- NOUVELLES PROPRIÉTÉS ---
  contactModalOpen: boolean = false;       // État du modal de contact
  // -------------------------------

  // Review properties
  reviewsPage: Page<ReviewDTO> | null = null;
  isLoadingReviews = false;
  reviewsErrorMessage: string | null = null;
  currentReviewsPage = 0;
  reviewsPageSize = 5; // Can be different from logement detail

  private routeSub: Subscription | undefined;
  private dataSub: Subscription | undefined;
  // --- AJOUTS SUBS ---
  private statusSub: Subscription | undefined;
  private actionSub: Subscription | undefined;
  private reviewsSub: Subscription | undefined;
  // -------------------
  private readonly imageBaseUrl = 'http://localhost:8088/api/images/'; // Définir la base URL ici

  // Add Math property
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private proprietaireService: ProprietaireService,
    private authService: AuthService, // <-- Injecter AuthService
    private reviewService: ReviewService
  ) {}

  ngOnInit(): void {
    // Déterminer si l'utilisateur est un étudiant connecté
    this.isCurrentUserEtudiant = this.authService.isLoggedIn() && !this.authService.isCurrentUserProprietaire();
    console.log(`ProfileComponent: User is Etudiant? ${this.isCurrentUserEtudiant}`);

    this.routeSub = this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const proprietaireId = +idParam;
        if (!isNaN(proprietaireId)) {
          this.loadProprietaireDetails(proprietaireId);
          // VÉRIFIER LE STATUT D'ABONNEMENT SEULEMENT SI ÉTUDIANT
          if (this.isCurrentUserEtudiant) {
            this.checkSubscription(proprietaireId);
          }
        } else {
          this.handleInvalidId("ID de propriétaire invalide.");
        }
      } else {
        this.handleInvalidId("Aucun ID de propriétaire fourni.");
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.dataSub?.unsubscribe();
    this.statusSub?.unsubscribe(); // <-- AJOUT
    this.actionSub?.unsubscribe();  // <-- AJOUT
    this.reviewsSub?.unsubscribe();
    console.log("ProfileComponent: Component destroyed, subscriptions cleaned up.");
  }

  loadProprietaireDetails(id: number): void {
    console.log(`ProfileComponent: Loading details for owner ID: ${id}`);
    this.isLoading = true;
    this.errorMessage = null;
    this.proprietaire = null; // Réinitialiser avant chargement
    // Reset review related properties
    this.reviewsPage = null;
    this.isLoadingReviews = false;
    this.reviewsErrorMessage = null;
    this.currentReviewsPage = 0;

    this.dataSub?.unsubscribe(); // Annuler l'appel précédent
    this.dataSub = this.proprietaireService.getProprietaireDetails(id).subscribe({
      next: (data) => {
        console.log("ProfileComponent: Owner details received:", data);
        this.proprietaire = data;
        this.isLoading = false;
        if (this.proprietaire?.id) {
          this.loadReviewsForProprietaire(this.proprietaire.id, 0);
        }
      },
      error: (err: any) => { // Add explicit type 'any' to err
        console.error("ProfileComponent: Error loading owner details:", err);
        this.errorMessage = err.message || "Impossible de charger le profil du propriétaire.";
        this.isLoading = false;
      }
    });
  }

  // --- NOUVELLE MÉTHODE : Vérifier le statut d'abonnement ---
  checkSubscription(id: number): void {
    if (!this.isCurrentUserEtudiant) return; // Double sécurité

    console.log(`ProfileComponent: Checking subscription status for owner ID: ${id}`);
    this.isCheckingSubscription = true; // Indiquer la vérification
    this.statusSub?.unsubscribe();

    this.statusSub = this.proprietaireService.checkSubscriptionStatus(id).pipe(
      finalize(() => this.isCheckingSubscription = false) // Arrêter le loading
    ).subscribe({
      next: (status: SubscriptionStatus) => {
        console.log(`ProfileComponent: Subscription status is ${status.isSubscribed}`);
        this.isSubscribed = status.isSubscribed;
      },
      error: (err: any) => { // Add explicit type 'any' to err
        // Ignorer les erreurs 401/403 ici car elles sont gérées par le guard
        if (err.status !== 401 && err.status !== 403) {
          console.warn(`ProfileComponent: Error checking subscription status for ${id}:`, err.message);
          // Optionnel: Afficher une petite erreur près du bouton
        } else {
          console.log(`ProfileComponent: Subscription check skipped (status ${err.status})`);
        }
        this.isSubscribed = false; // Assumer non abonné en cas d'erreur
      }
    });
  }

  // --- NOUVELLE MÉTHODE : Gérer le clic sur le bouton S'abonner/Abonné ---
  toggleSubscription(): void {
    // Vérifications de garde
    if (!this.proprietaire?.id || !this.isCurrentUserEtudiant || this.isSubscriptionLoading || this.isCheckingSubscription) {
      console.warn("ProfileComponent: Toggle subscription prevented.", {
        owner: !!this.proprietaire,
        isEtudiant: this.isCurrentUserEtudiant,
        actionLoading: this.isSubscriptionLoading,
        statusChecking: this.isCheckingSubscription
      });
      return;
    }

    this.isSubscriptionLoading = true; // Activer le spinner
    const ownerId = this.proprietaire.id;
    console.log(`ProfileComponent: Toggling subscription for ${ownerId}. Current state: ${this.isSubscribed}`);

    // Détermine l'action API à appeler
    // ERREUR ici: 'Observable' n'est pas défini car non importé
    const action$: Observable<void> = this.isSubscribed // <--- ERREUR TS2304 (ligne 145 approx.)
      ? this.proprietaireService.unsubscribeFromOwner(ownerId)
      : this.proprietaireService.subscribeToOwner(ownerId);

    this.actionSub?.unsubscribe(); // Annuler l'action précédente

    this.actionSub = action$.pipe(
      finalize(() => { // Assure que le loading s'arrête même en cas d'erreur
          this.isSubscriptionLoading = false;
          console.log(`ProfileComponent: Subscription action finalized for ${ownerId}`);
      })
    ).subscribe({
      next: () => {
        this.isSubscribed = !this.isSubscribed; // Met à jour l'état local SI l'API réussit
        console.log(`ProfileComponent: Subscription status updated locally to ${this.isSubscribed}`);
        // Optionnel: Afficher un message de confirmation (toast)
      },
      // ERREUR ici: Le paramètre 'err' n'a pas de type explicite
      error: (err: any) => { // <--- ERREUR TS7006 (ligne 162 approx.)
        console.error(`ProfileComponent: Error toggling subscription for ${ownerId}:`, err);
        // Afficher un message d'erreur clair à l'utilisateur
        alert(err.message || "Une erreur est survenue lors de la mise à jour de l'abonnement.");
        // Ne pas changer this.isSubscribed ici, car l'API a échoué.
        // Optionnel: Re-vérifier le statut pour être sûr
        // this.checkSubscription(ownerId);
      }
    });
  }

  handleInvalidId(message: string): void { // Modifié pour accepter un message
    console.error("ProfileComponent:", message);
    this.errorMessage = message + " Redirection vers la page d'accueil...";
    this.isLoading = false;
    setTimeout(() => this.router.navigate(['/']), 3000); // Redirige vers l'accueil général
  }

  loadReviewsForProprietaire(proprietaireId: number, page: number): void {
    this.isLoadingReviews = true;
    this.reviewsErrorMessage = null;
    this.reviewsSub?.unsubscribe();
    this.reviewsSub = this.reviewService.getAvisSurProprietaire(proprietaireId, page, this.reviewsPageSize)
      .pipe(
        finalize(() => this.isLoadingReviews = false)
      )
      .subscribe({
        next: (pageData) => {
          this.reviewsPage = pageData;
          this.currentReviewsPage = page;
        },
        error: (err: any) => { // Add explicit type 'any' to err
          this.reviewsErrorMessage = err.message || 'Impossible de charger les avis sur le propriétaire.';
        }
      });
  }

  goToProprietaireReviewsPage(pageNumber: number): void {
    if (this.proprietaire?.id && pageNumber >= 0 && (!this.reviewsPage || pageNumber < this.reviewsPage.totalPages)) {
      this.loadReviewsForProprietaire(this.proprietaire.id, pageNumber);
    }
  }

  getProprietaireReviewPagesArray(): number[] {
    if (!this.reviewsPage || this.reviewsPage.totalPages <= 1) {
      return [];
    }
    return Array(this.reviewsPage.totalPages).fill(0).map((x, i) => i);
  }

  // Combined getImageUrl and getProprietaireAvatarUrl into one, as they are similar
  // And add getReviewerAvatarUrl, which is identical for now
  getDynamicImageUrl(identifier?: string | null, type: 'logement' | 'avatar' = 'logement'): string {
    const placeholderLogement = 'assets/images/property-placeholder.jpg';
    const placeholderAvatar = 'assets/images/avatar-placeholder.png';
    const placeholder = type === 'avatar' ? placeholderAvatar : placeholderLogement;

    if (!identifier) {
      return placeholder;
    }
    if (identifier.startsWith('http://') || identifier.startsWith('https://') || identifier.startsWith('assets/')) {
      return identifier;
    }
    return `${this.imageBaseUrl}${identifier}`;
  }

  // Replace getProprietaireAvatarUrl with getDynamicImageUrl in the template
  // Replace getImageUrl with getDynamicImageUrl in the template

  getReviewerAvatarUrl(avatarIdentifier?: string | null): string {
    return this.getDynamicImageUrl(avatarIdentifier, 'avatar');
  }

  // Méthode pour obtenir la classe CSS selon le statut du logement
  getStatutClass(statut: string | null | undefined): string {
    if (!statut) return 'status-unknown';
    
    switch (statut.toLowerCase()) {
      case 'disponible':
        return 'status-available';
      case 'occupé':
      case 'occupe':
        return 'status-occupied';
      case 'réservé':
      case 'reserve':
        return 'status-reserved';
      case 'active':
        return 'status-active';
      default:
        return 'status-unknown';
    }
  }

  // Méthode pour obtenir le libellé du statut
  getStatutLibelle(statut: string | null | undefined): string {
    if (!statut) return 'Non défini';
    
    switch (statut.toLowerCase()) {
      case 'disponible':
        return 'Disponible';
      case 'occupé':
      case 'occupe':
        return 'Occupé';
      case 'réservé':
      case 'reserve':
        return 'Réservé';
      case 'active':
        return 'Active';
      default:
        return statut;
    }
  }

  // Méthode pour ouvrir le modal de contact
  openContactModal(): void {
    this.contactModalOpen = true;
    // Logique à implémenter plus tard pour gérer le modal
  }

  // Méthode pour fermer le modal de contact
  closeContactModal(): void {
    this.contactModalOpen = false;
  }

  // Méthode pour envoyer un message (à développer plus tard)
  sendMessage(message: string): void {
    console.log('Message à envoyer:', message);
    // Logique d'envoi de message à implémenter
    this.closeContactModal();
  }

}