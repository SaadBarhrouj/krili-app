// KRILI-frontend\src\app\proprietaire\logements\logements.component.ts
// Affiche et gère la liste des logements d'un propriétaire.

import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription, finalize, Observable } from 'rxjs';

import { LogementService } from '../../logement/logement.service';
import { LogementDTO } from '../../logement/logement.dto'; // Assurez-vous que displayBadges y est.

// Interface pour étendre LogementDTO avec des états UI spécifiques à ce composant
interface LogementViewModel extends LogementDTO {
  isDeleting?: boolean;
  isChangingState?: boolean;
  actionError?: string | null;
}

@Component({
  selector: 'app-logements', // Le sélecteur par défaut généré
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './logements.component.html',
  styleUrls: ['./logements.component.css']
})
export class LogementsComponent implements OnInit, OnDestroy {
  logements: LogementViewModel[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  activeDropdownLogementId: number | null = null;

  private logementsSub: Subscription | undefined;
  private actionSub: Subscription | undefined;

  constructor(
    private logementService: LogementService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLogements();
  }

  ngOnDestroy(): void {
    this.logementsSub?.unsubscribe();
    this.actionSub?.unsubscribe();
  }

  // Ferme tous les dropdowns si on clique en dehors
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Vérifie si le clic n'est pas sur un bouton qui ouvre/ferme le dropdown
    const target = event.target as HTMLElement;
    if (!target.closest('.more-actions-btn')) {
      this.closeAllDropdowns();
    }
  }

  loadLogements(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.logementsSub?.unsubscribe();

    this.logementsSub = this.logementService.getLogementsByProprietaire().pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data) => {
        this.logements = data.map(l => ({
          ...l,
          displayBadges: l.displayBadges || [],
          isDeleting: false,
          isChangingState: false,
          actionError: null
        }));
      },
      error: (err) => {
        this.errorMessage = err.message || "Impossible de charger vos logements.";
        this.logements = [];
      }
    });
  }

  getActiveCount(): number { return this.logements.filter(l => l.statut === 'ACTIVE').length; }
  getRentedCount(): number { return this.logements.filter(l => l.statut === 'LOUEE').length; }
  getDraftCount(): number { return this.logements.filter(l => l.statut === 'BROUILLON').length; }

  editLogement(logementId: number | undefined | null): void {
    this.closeAllDropdowns();
    if (logementId) {
      this.router.navigate(['/proprietaire/logements/nouveau'], { queryParams: { id: logementId } });
      console.log(`Navigation vers édition pour logement ID: ${logementId}`);
    }
  }

  deleteLogement(logementId: number | undefined | null): void {
    this.closeAllDropdowns();
    if (!logementId) return;

    if (confirm("Êtes-vous sûr de vouloir supprimer ce logement ? Cette action est irréversible.")) {
      const logementVM = this.logements.find(l => l.id === logementId);
      if (logementVM) { logementVM.isDeleting = true; logementVM.actionError = null; this.cdr.detectChanges(); }

      this.actionSub?.unsubscribe();
      this.actionSub = this.logementService.supprimerLogement(logementId).pipe(
        finalize(() => { if (logementVM) logementVM.isDeleting = false; this.cdr.detectChanges(); })
      ).subscribe({
        next: () => {
          this.logements = this.logements.filter(l => l.id !== logementId);
          alert('Logement supprimé avec succès.');
        },
        error: (err) => {
          if (logementVM) logementVM.actionError = err.message || "Erreur de suppression.";
          alert("Erreur lors de la suppression: " + (err.message || "Erreur inconnue"));
        }
      });
    }
  }

  changeLogementStatut(logementId: number | undefined | null, action: 'publier' | 'archiver' | 'reserver' | 'confirmerLocation' | 'remettreEnLigne' | 'passerEnBrouillon'): void {
    this.closeAllDropdowns();
    if (!logementId) return;
    const logementVM = this.logements.find(l => l.id === logementId);
    if (!logementVM) return;

    logementVM.isChangingState = true; logementVM.actionError = null; this.cdr.detectChanges();
    let actionObservable: Observable<LogementDTO>;

    switch (action) {
      case 'publier': actionObservable = this.logementService.publierLogement(logementId); break;
      case 'archiver': actionObservable = this.logementService.archiverLogement(logementId); break;
      case 'reserver': actionObservable = this.logementService.reserverLogement(logementId); break;
      case 'confirmerLocation': actionObservable = this.logementService.confirmerLocationLogement(logementId); break;
      case 'remettreEnLigne': actionObservable = this.logementService.remettreEnLigneLogement(logementId); break;
      case 'passerEnBrouillon': actionObservable = this.logementService.passerEnBrouillonLogement(logementId); break;
      default:
        logementVM.isChangingState = false; this.cdr.detectChanges();
        console.error("Action de changement de statut inconnue:", action); return;
    }

    this.actionSub?.unsubscribe();
    this.actionSub = actionObservable.pipe(
      finalize(() => { if (logementVM) logementVM.isChangingState = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: (updatedLogementDTO) => {
        const index = this.logements.findIndex(l => l.id === updatedLogementDTO.id);
        if (index > -1) {
          this.logements[index] = { ...this.logements[index], ...updatedLogementDTO, isChangingState: false, actionError: null };
        }
        alert(`Statut du logement mis à jour : ${this.getStatutLibelle(updatedLogementDTO.statut)}`);
      },
      error: (err) => {
        if (logementVM) logementVM.actionError = err.message || `Erreur: ${action}`;
        alert("Erreur: " + (err.message || `Impossible d'effectuer l'action "${action}"`));
      }
    });
  }

  getImageUrl(photoIdentifier: string | undefined | null): string {
    const placeholder = 'https://via.placeholder.com/100x80/E5E7EB/9CA3AF?text=K';
    if (!photoIdentifier) return placeholder;
    if (photoIdentifier.startsWith('http')) return photoIdentifier;
    const imageBaseUrl = 'http://localhost:8088/api/images/';
    return `${imageBaseUrl}${photoIdentifier}`;
  }

  getStatutLibelle(statut: string | undefined | null): string {
    if (!statut) return 'Inconnu';
    switch (statut.toUpperCase()) {
      case 'ACTIVE': return 'Publié'; case 'BROUILLON': return 'Brouillon';
      case 'RESERVEE': return 'Réservé'; case 'LOUEE': return 'Loué';
      case 'ARCHIVEE': return 'Archivé'; default: return statut;
    }
  }

  getStatutClass(statut: string | undefined | null): string {
     if (!statut) return 'status-inactive';
    switch (statut.toUpperCase()) {
      case 'ACTIVE': return 'status-active'; case 'BROUILLON': return 'status-brouillon';
      case 'RESERVEE': return 'status-reservee'; case 'LOUEE': return 'status-louee';
      case 'ARCHIVEE': return 'status-archivee'; default: return 'status-inactive';
    }
  }

  toggleDropdown(logementId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.activeDropdownLogementId = this.activeDropdownLogementId === logementId ? null : logementId;
  }

  closeAllDropdowns(): void {
    if (this.activeDropdownLogementId !== null) { // Ferme seulement si un dropdown est ouvert
        this.activeDropdownLogementId = null;
        this.cdr.detectChanges(); // Peut être nécessaire si le changement n'est pas détecté
    }
  }

  getBadgeText(badgeKey: string | undefined | null): string {
    if (!badgeKey) return '';
    switch (badgeKey) {
      case 'BADGE_PREMIUM': return 'Premium'; case 'BADGE_ULTIMATE': return 'Ultimate';
      case 'BADGE_NOUVEAUTE': return 'Nouveauté'; default: return badgeKey.replace('BADGE_', '').replace('_', ' ');
    }
  }

  getBadgeIcon(badgeKey: string | undefined | null): string {
    if (!badgeKey) return 'fas fa-tag';
    switch (badgeKey) {
      case 'BADGE_PREMIUM': return 'fas fa-star'; case 'BADGE_ULTIMATE': return 'fas fa-rocket';
      case 'BADGE_NOUVEAUTE': return 'fas fa-magic'; default: return 'fas fa-tag';
    }
  }

  getBadgeSpecificClass(badgeKey: string | undefined | null): string {
    if (!badgeKey) return '';
    switch (badgeKey) {
      case 'BADGE_PREMIUM': return 'badge-style-premium'; case 'BADGE_ULTIMATE': return 'badge-style-ultimate';
      case 'BADGE_NOUVEAUTE': return 'badge-style-nouveaute'; default: return 'badge-style-default';
    }
  }
}