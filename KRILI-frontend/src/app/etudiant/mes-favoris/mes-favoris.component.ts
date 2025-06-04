// KRILI-frontend\src\app\etudiant\mes-favoris\mes-favoris.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { LogementService } from '../../logement/logement.service';
import { LogementDTO } from '../../logement/logement.dto';
import { AccueilComponent } from '../../accueil/accueil.component'; // Pour r??utilisation m??thodes

@Component({
  selector: 'app-mes-favoris',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './mes-favoris.component.html',
  styleUrls: ['./mes-favoris.component.css']
})
export class MesFavorisComponent implements OnInit, OnDestroy {
  favoriteLogements: LogementDTO[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  removingFavoriteId: number | null = null; // NOUVEAU: ID du logement en cours de suppression

  private favSub: Subscription | undefined;
  private accueilHelper: AccueilComponent; // Pour les m??thodes utilitaires

  constructor(
    private logementService: LogementService,
    private cdr: ChangeDetectorRef
  ) {
    // Astuce pour r??utiliser les m??thodes d'affichage (non critiques pour l'erreur actuelle)
    // @ts-ignore // Pour contourner l'erreur de constructeur d'AccueilComponent
    this.accueilHelper = new AccueilComponent(null, null, null, null, null, null, null, null, null, null);
  }

  ngOnInit(): void {
    this.loadFavorites();
  }

  ngOnDestroy(): void {
    this.favSub?.unsubscribe();
  }

  loadFavorites(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.favSub = this.logementService.getMyFavoriteLogements().pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data) => {
        this.favoriteLogements = data.map(l => ({ ...l, isFavorite: true })); // Marquer comme favori par d??faut ici
      },
      error: (err) => {
        this.errorMessage = err.message || 'Impossible de charger vos favoris.';
        this.favoriteLogements = [];
      }
    });
  }

  removeFromFavorites(logementId: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.removingFavoriteId === logementId) return; // D??j?? en cours de suppression

    if (!confirm("??tes-vous s??r de vouloir retirer ce logement de vos favoris ?")) {
      return;
    }

    this.removingFavoriteId = logementId; // D??finir l'ID en cours de suppression
    this.cdr.detectChanges();

    this.logementService.removeFromFavorites(logementId).pipe(
      finalize(() => {
        this.removingFavoriteId = null; // R??initialiser l'ID ?? la fin
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.favoriteLogements = this.favoriteLogements.filter(l => l.id !== logementId);
        // Optionnel: Afficher un toast de succ??s
      },
      error: (err) => {
        alert("Erreur lors de la suppression du favori: " + err.message);
      }
    });
  }

  // M??thodes utilitaires r??utilis??es (s'assurer qu'elles n'ont pas de d??pendances non satisfaites)
  getImageUrl(photoIdentifier: string | undefined | null): string {
    return this.accueilHelper.getImageUrl(photoIdentifier);
  }
  getBadgeText(badgeKey: string | undefined | null): string {
    return this.accueilHelper.getBadgeText(badgeKey);
  }
  getBadgeIcon(badgeKey: string | undefined | null): string {
    return this.accueilHelper.getBadgeIcon(badgeKey);
  }
  getBadgeSpecificClass(badgeKey: string | undefined | null): string {
    return this.accueilHelper.getBadgeSpecificClass(badgeKey);
  }
  getLogementSecondaryInfo(logement: LogementDTO): string {
    return this.accueilHelper.getLogementSecondaryInfo(logement);
  }
  getStatutLibelle(statut: string | undefined | null): string {
    return this.accueilHelper.getStatutLibelle(statut);
  }
   getOwnerAvatarUrl(avatarId: string | undefined | null): string { // AJOUT DE CETTE M??THODE
    return this.accueilHelper.getOwnerAvatarUrl(avatarId);
  }
}