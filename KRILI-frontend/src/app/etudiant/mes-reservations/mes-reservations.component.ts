// FICHIER: KRILI-frontend\src\app\etudiant\mes-reservations\mes-reservations.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router'; // Import de Router
import { Subscription, finalize } from 'rxjs';
import { ReservationService } from '../../shared/reservation.service'; // Assurez-vous que le chemin est correct

// D??finition de l'interface pour la vue des r??servations de l'??tudiant
// Doit correspondre ?? ReservationListDTO du backend
export interface ReservationEtudiantView {
  id: number;
  startDate: string;
  endDate: string;
  status: string; // PENDING, CONFIRMED, CANCELED_BY_ETUDIANT, CANCELED_BY_PROPRIETAIRE, ONGOING, COMPLETED, DISPUTED
  createdAt: string;
  logement: {
    id: number;
    adresseLigne1: string;
    type: string;
    photoPrincipaleUrl?: string | null; // <<<< CHAMP IMPORTANT POUR L'IMAGE
    prix: number;
  };
  proprietaire?: {
    id: number;
    nom: string;
    // avatarUrl?: string | null; // Si vous l'ajoutez au DTO backend
  };
  messageEtudiant?: string | null;
  messageProprietaire?: string | null;

  // ??tats UI sp??cifiques au composant
  isCancelling?: boolean;
  cancelError?: string | null;
}


@Component({
  selector: 'app-mes-reservations',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './mes-reservations.component.html',
  styleUrls: ['./mes-reservations.component.css']
})
export class MesReservationsComponent implements OnInit, OnDestroy {

  reservations: ReservationEtudiantView[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  currentFilter: string = 'all';

  private reservationsSub: Subscription | undefined;
  private cancelSub: Subscription | undefined;

  constructor(
    private reservationService: ReservationService,
    private cdr: ChangeDetectorRef,
    private router: Router // Injection de Router pour une utilisation future
  ) {}

  ngOnInit(): void {
    this.loadMesReservations();
  }

  ngOnDestroy(): void {
    this.reservationsSub?.unsubscribe();
    this.cancelSub?.unsubscribe();
  }

  loadMesReservations(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.reservationsSub?.unsubscribe();

    // Le service retourne maintenant Observable<ReservationListDTO[]>
    this.reservationsSub = this.reservationService.getMesReservationsEtudiant()
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (backendData: any[]) => { // backendData est une liste de ReservationListDTO
          this.reservations = backendData.map(resBackend => {
            // Mapping explicite pour correspondre ?? ReservationEtudiantView
            const logementData = resBackend.logement || {}; // S??curit?? pour ??viter les erreurs si logement est null
            const proprietaireData = resBackend.proprietaire || {};

            return {
              id: resBackend.id,
              startDate: resBackend.startDate,
              endDate: resBackend.endDate,
              status: resBackend.status?.toUpperCase(), // S'assurer que c'est en majuscules
              createdAt: resBackend.createdAt,
              logement: {
                id: logementData.id,
                adresseLigne1: logementData.adresseLigne1,
                type: logementData.type,
                photoPrincipaleUrl: logementData.photoPrincipaleUrl, // Utiliser le champ correct du DTO
                prix: logementData.prix
              },
              proprietaire: proprietaireData.id ? {
                id: proprietaireData.id,
                nom: proprietaireData.nom,
                // avatarUrl: proprietaireData.avatarUrl // Si pr??sent
              } : undefined,
              messageEtudiant: resBackend.messageEtudiant,
              messageProprietaire: resBackend.messageProprietaire,
              isCancelling: false,
              cancelError: null
            };
          }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          console.log("R??servations mapp??es pour la vue:", this.reservations);
          this.applyFilter();
        },
        error: (err: Error) => {
          this.errorMessage = err.message || "Impossible de charger vos r??servations.";
          this.reservations = [];
          console.error("Erreur chargement r??servations:", err);
        }
      });
  }

  get filteredReservations(): ReservationEtudiantView[] {
    // Si le filtre est 'all', retourner toutes les réservations
    if (!this.currentFilter || this.currentFilter === 'all' || this.currentFilter === 'ALL') {
      return this.reservations;
    }
    // Sinon, filtrer par le statut sélectionné
    return this.reservations.filter(res => res.status === this.currentFilter);
  }

  applyFilter(filter: string = this.currentFilter): void {
    // Conserver 'all' en minuscule pour la cohérence d'affichage
    this.currentFilter = filter === 'all' ? 'all' : filter.toUpperCase(); 
    console.log(`Filtre appliqué: ${this.currentFilter}, nombre de réservations: ${this.filteredReservations.length}`);
    this.cdr.detectChanges();
  }


  canBeCancelled(reservationStatus: string | null | undefined): boolean {
    if (!reservationStatus) return false;
    const statusUpper = reservationStatus.toUpperCase();
    return statusUpper === 'PENDING' || statusUpper === 'CONFIRMED';
  }

  onCancelReservation(reservationId: number): void {
    const reservation = this.reservations.find(r => r.id === reservationId);
    if (!reservation || reservation.isCancelling || !this.canBeCancelled(reservation.status)) {
      return;
    }
    if (!confirm("??tes-vous s??r de vouloir annuler cette demande/r??servation ?")) {
      return;
    }
    reservation.isCancelling = true;
    reservation.cancelError = null;
    this.cdr.detectChanges();

    this.cancelSub?.unsubscribe();
    this.cancelSub = this.reservationService.annulerDemandeParEtudiant(reservationId)
      .pipe(finalize(() => {
        if (reservation) { reservation.isCancelling = false; }
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (updatedReservationData: any) => {
          alert("R??servation annul??e avec succ??s.");
          // Recharger la liste est le plus simple pour refl??ter tous les changements (y compris ??tat du logement)
          this.loadMesReservations();
        },
        error: (err: Error) => {
          if (reservation) { reservation.cancelError = err.message || "Erreur lors de l'annulation."; }
          alert(err.message || "Une erreur est survenue lors de l'annulation.");
        }
      });
  }

getStatutLibelle(statut: string | null | undefined): string {
  if (!statut) return 'Inconnu';
  switch (statut.toUpperCase()) {
    case 'PENDING': return 'En attente';
    case 'CONFIRMED': return 'Confirmée';
    case 'CANCELED_BY_ETUDIANT': return 'Annulée par vous';
    case 'CANCELED_BY_PROPRIETAIRE': return 'Refusée/Annulée';
    case 'ONGOING': return 'Location en cours';
    case 'COMPLETED': return 'Location terminée';
    case 'DISPUTED': return 'En litige';
    default: return statut;
  }
}


  getStatutClass(statut: string | null | undefined): string {
    if (!statut) return 'status-unknown';
    switch (statut.toUpperCase()) {
      case 'PENDING': return 'status-pending';
      case 'CONFIRMED': return 'status-confirmed';
      case 'CANCELED_BY_ETUDIANT': return 'status-canceled-etudiant';
      case 'CANCELED_BY_PROPRIETAIRE': return 'status-canceled-proprio';
      case 'ONGOING': return 'status-ongoing';
      case 'COMPLETED': return 'status-completed';
      case 'DISPUTED': return 'status-disputed';
      default: return 'status-unknown';
    }
  }

  getImageUrl(photoIdentifier: string | undefined | null): string {
    const placeholder = 'assets/images/property-placeholder.jpg'; // Placeholder g??n??rique
    if (!photoIdentifier) {
      return placeholder;
    }
    if (photoIdentifier.startsWith('http://') || photoIdentifier.startsWith('https://') || photoIdentifier.startsWith('assets/')) {
      return photoIdentifier;
    }
    const imageBaseUrl = 'http://localhost:8088/api/images/'; // Doit correspondre ?? votre ImageController
    return `${imageBaseUrl}${photoIdentifier}`;
  }

  contactProprietaire(proprietaireId?: number, logementId?: number): void {
    if (proprietaireId && logementId) {
      // Naviguer vers une future page de messagerie, en passant les infos n??cessaires
      this.router.navigate(['/etudiant/messages'], { // Assurez-vous que cette route existe
        queryParams: { 
          recipientId: proprietaireId, 
          relatedLogementId: logementId 
        } 
      });
      // Pour l'instant, une alerte si la page de messages n'est pas pr??te :
      // alert(`Redirection vers messagerie pour propri??taire ID: ${proprietaireId} au sujet du logement ID: ${logementId}.`);
    } else {
      alert("Impossible de contacter le propri??taire: informations manquantes.");
    }
  }
}