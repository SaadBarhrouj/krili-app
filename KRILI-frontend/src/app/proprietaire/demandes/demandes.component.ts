// FICHIER: KRILI-frontend\src\app\proprietaire\demandes\demandes.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { ReservationService } from '../../shared/reservation.service';

export interface DemandeProprietaireView {
  id: number;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  logement: {
    id: number;
    adresseLigne1: string;
    type: string;
    photoPrincipaleUrl?: string | null;
    prix: number;
  };
  etudiant: {
    id: number;
    nom: string;
    email: string;
    etablissement?: string;
    avatarUrl?: string | null;
  };
  messageEtudiant?: string | null;
  messageProprietaire?: string | null;
  isProcessing?: boolean;
  actionError?: string | null;
}

@Component({
  selector: 'app-demandes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './demandes.component.html',
  styleUrls: ['./demandes.component.css']
})
export class DemandesComponent implements OnInit, OnDestroy {

  demandes: DemandeProprietaireView[] = []; // Liste compl??te des demandes re??ues
  _filteredDemandes: DemandeProprietaireView[] = []; // Liste utilis??e pour l'affichage

  isLoading = true;
  errorMessage: string | null = null;
  
  currentStatusTab: string = 'PENDING';
  searchTerm: string = '';

  statusTabs = [
    { label: 'En Attente', value: 'PENDING', icon: 'fas fa-clock' },
    { label: 'Accept??es', value: 'CONFIRMED', icon: 'fas fa-check-circle' },
    { label: 'Refus??es', value: 'CANCELED_BY_PROPRIETAIRE', icon: 'fas fa-times-circle' },
    { label: 'Annul??es (??tud.)', value: 'CANCELED_BY_ETUDIANT', icon: 'fas fa-user-slash' },
    { label: 'Toutes', value: 'ALL', icon: 'fas fa-list' }
  ];

  private demandesSub: Subscription | undefined;
  private actionSub: Subscription | undefined;

  constructor(
    private reservationService: ReservationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDemandesRecues();
  }

  ngOnDestroy(): void {
    this.demandesSub?.unsubscribe();
    this.actionSub?.unsubscribe();
  }

  loadDemandesRecues(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.demandesSub?.unsubscribe();

    this.demandesSub = this.reservationService.getDemandesPourProprietaire()
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (backendData: any[]) => {
          this.demandes = backendData.map(resBackend => {
            const logementData = resBackend.logement || {};
            const etudiantData = resBackend.etudiant || {};
            return {
              id: resBackend.id,
              startDate: resBackend.startDate,
              endDate: resBackend.endDate,
              status: resBackend.status?.toUpperCase(),
              createdAt: resBackend.createdAt,
              logement: {
                id: logementData.id,
                adresseLigne1: logementData.adresseLigne1 || 'Logement non sp??cifi??',
                type: logementData.type || 'Type inconnu',
                photoPrincipaleUrl: logementData.photoPrincipaleUrl,
                prix: logementData.prix
              },
              etudiant: {
                id: etudiantData.id,
                nom: etudiantData.nom || '??tudiant inconnu',
                email: etudiantData.email || 'Email non fourni',
                etablissement: etudiantData.etablissement,
                avatarUrl: etudiantData.avatarUrl
              },
              messageEtudiant: resBackend.messageEtudiant,
              messageProprietaire: resBackend.messageProprietaire,
              isProcessing: false,
              actionError: null
            };
          }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          this.applyFilters(); // Appliquer les filtres apr??s le chargement
        },
        error: (err: Error) => {
          this.errorMessage = err.message || "Impossible de charger les demandes de r??servation.";
          this.demandes = [];
          this._filteredDemandes = []; // S'assurer que la liste filtr??e est aussi vide
        }
      });
  }

  // MODIFICATION : Le getter pointe maintenant vers la propri??t?? _filteredDemandes
  get filteredDemandes(): DemandeProprietaireView[] {
    return this._filteredDemandes;
  }

  // NOUVELLE M??THODE : applyFilters (appel??e par les ??v??nements)
  applyFilters(): void {
    let tempDemandes = this.demandes;

    // Filtrer par statut
    if (this.currentStatusTab !== 'ALL') {
      tempDemandes = tempDemandes.filter(demande => demande.status === this.currentStatusTab);
    }

    // Filtrer par terme de recherche
    if (this.searchTerm.trim() !== '') {
      const searchLower = this.searchTerm.toLowerCase();
      tempDemandes = tempDemandes.filter(demande =>
        demande.etudiant.nom.toLowerCase().includes(searchLower) ||
        demande.logement.adresseLigne1.toLowerCase().includes(searchLower) ||
        (demande.etudiant.email && demande.etudiant.email.toLowerCase().includes(searchLower)) ||
        (demande.messageEtudiant && demande.messageEtudiant.toLowerCase().includes(searchLower))
      );
    }
    this._filteredDemandes = tempDemandes;
    this.cdr.detectChanges(); // S'assurer que la vue est mise ?? jour
  }

  setStatusFilter(status: string): void {
    this.currentStatusTab = status;
    this.applyFilters(); // Appliquer les filtres quand un onglet est cliqu??
  }

  getCountForStatus(status: string): number {
    if (status === 'ALL') {
      return this.demandes.length;
    }
    // Compter sur la liste non filtr??e this.demandes pour les badges
    return this.demandes.filter(demande => demande.status === status).length;
  }

  onAcceptDemande(demandeId: number): void {
    const demande = this.demandes.find(d => d.id === demandeId); // Chercher dans la liste compl??te
    if (!demande || demande.isProcessing) return;

    demande.isProcessing = true;
    demande.actionError = null;
    this.cdr.detectChanges();

    this.actionSub?.unsubscribe();
    this.actionSub = this.reservationService.accepterDemande(demandeId)
      .pipe(finalize(() => {
        if (demande) demande.isProcessing = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: any) => {
          alert("Demande accept??e !");
          this.loadDemandesRecues(); // Recharger pour mettre ?? jour tous les ??tats et compteurs
        },
        error: (err: Error) => {
          if (demande) demande.actionError = err.message || "Erreur lors de l'acceptation.";
          alert(err.message || "Une erreur est survenue lors de l'acceptation.");
        }
      });
  }

  onRejectDemande(demandeId: number): void {
    const demande = this.demandes.find(d => d.id === demandeId); // Chercher dans la liste compl??te
    if (!demande || demande.isProcessing) return;

    demande.isProcessing = true;
    demande.actionError = null;
    this.cdr.detectChanges();

    this.actionSub?.unsubscribe();
    this.actionSub = this.reservationService.refuserDemande(demandeId)
      .pipe(finalize(() => {
        if (demande) demande.isProcessing = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: any) => {
          alert("Demande refus??e.");
          this.loadDemandesRecues(); // Recharger
        },
        error: (err: Error) => {
          if (demande) demande.actionError = err.message || "Erreur lors du refus.";
          alert(err.message || "Une erreur est survenue.");
        }
      });
  }

  getStatutLibelle(statut: string | null | undefined): string {
    if (!statut) return 'Inconnu';
    switch (statut.toUpperCase()) {
      case 'PENDING': return 'En attente';
      case 'CONFIRMED': return 'Accept??e';
      case 'CANCELED_BY_ETUDIANT': return 'Annul??e (??tudiant)';
      case 'CANCELED_BY_PROPRIETAIRE': return 'Refus??e';
      case 'ONGOING': return 'Location en cours';
      case 'COMPLETED': return 'Location termin??e';
      default: return statut;
    }
  }
  
  getStatutClass(status: string | null | undefined): string {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toUpperCase()) {
      case 'PENDING': return 'bg-amber-100 text-amber-800 dark:bg-amber-700/30 dark:text-amber-300';
      case 'CONFIRMED': return 'bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-300';
      case 'CANCELED_BY_PROPRIETAIRE': return 'bg-red-100 text-red-800 dark:bg-red-700/30 dark:text-red-300';
      case 'CANCELED_BY_ETUDIANT': return 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300';
      case 'ONGOING': return 'bg-blue-100 text-blue-800 dark:bg-blue-700/30 dark:text-blue-300';
      case 'COMPLETED': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-700/30 dark:text-indigo-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300';
    }
  }

  getImageUrl(photoIdentifier: string | undefined | null): string {
    const placeholder = 'assets/images/property-placeholder.jpg';
    if (!photoIdentifier) return placeholder;
    if (photoIdentifier.startsWith('http')) return photoIdentifier;
    const imageBaseUrl = 'http://localhost:8088/api/images/';
    return `${imageBaseUrl}${photoIdentifier}`;
  }

  getEtudiantAvatarUrl(avatarIdentifier?: string | null): string {
    const placeholder = 'assets/images/avatar-placeholder.png';
    if (!avatarIdentifier) return placeholder;
    if (avatarIdentifier.startsWith('http') || avatarIdentifier.startsWith('assets/')) return avatarIdentifier;
    const imageBaseUrl = 'http://localhost:8088/api/images/';
    return `${imageBaseUrl}${avatarIdentifier}`;
  }

  contactEtudiant(etudiantId?: number, logementId?: number): void {
    if (etudiantId && logementId) {
      alert(`Logique de contact pour ??tudiant ID: ${etudiantId} au sujet du logement ID: ${logementId} ?? impl??menter.`);
    } else {
      alert("Informations manquantes pour contacter l'??tudiant.");
    }
  }
}