// KRILI-frontend\src\app\etudiant\notifications\notifications.component.ts
// Gère l'affichage et les interactions pour la page des notifications de l'étudiant.

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // DatePipe pour formater les dates
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService, Page } from '../../shared/notification.service'; // Ajustez le chemin si nécessaire
import { NotificationDTO, FrontendNotificationType } from '../../models/notification.dto'; // Ajustez le chemin si nécessaire
import { AuthService } from '../../auth/auth.service'; // Pour mettre à jour le compteur global

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe], // DatePipe est nécessaire pour le template
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notificationsPage: Page<NotificationDTO> | null = null;
  isLoading = true;
  errorMessage: string | null = null;
  currentPage = 0; // Les pages de Spring Data JPA sont indexées à partir de 0
  pageSize = 10;   // Nombre de notifications par page

  get hasUnreadNotifications(): boolean {
    return !!this.notificationsPage?.content?.some(n => n && !n.read);
  }

  private notificationSub: Subscription | undefined;
  private actionSub: Subscription | undefined;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService, // Pour mettre à jour le compteur de notifications dans le header
    private cdr: ChangeDetectorRef    // Pour forcer la détection des changements si nécessaire
  ) {}

  ngOnInit(): void {
    this.loadNotifications(this.currentPage);
  }

  ngOnDestroy(): void {
    this.notificationSub?.unsubscribe();
    this.actionSub?.unsubscribe();
  }

  /**
   * Charge les notifications pour la page donnée.
   * @param page Numéro de la page à charger (base 0).
   */
  loadNotifications(page: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.notificationSub?.unsubscribe(); // Annuler la requête précédente si elle existe

    this.notificationSub = this.notificationService.getMyNotifications(page, this.pageSize)
      .subscribe({
        next: (data) => {
          this.notificationsPage = data;
          this.currentPage = data.number; // Mettre à jour la page actuelle
          this.isLoading = false;
          // Rafraîchir le compteur global après avoir chargé les notifications de cette page
          this.refreshGlobalUnreadCount();
        },
        error: (err) => {
          this.errorMessage = err.message || 'Impossible de charger les notifications.';
          this.isLoading = false;
        }
      });
  }

  /**
   * Demande au NotificationService de récupérer le nouveau total de notifications non lues
   * et met à jour le compteur global via AuthService.
   */
  private refreshGlobalUnreadCount(): void {
    // S'assurer que l'utilisateur est un étudiant connecté
    if (!this.authService.isLoggedIn() || this.authService.isCurrentUserProprietaire()) {
      this.authService.setUnreadNotificationCount(0); // S'assurer que c'est 0 pour les autres rôles
      return;
    }

    this.notificationService.getUnreadNotificationCount().subscribe({
        next: (response) => {
            console.log('NotificationsComponent: Compteur global rafraîchi à', response.unreadCount);
            this.authService.setUnreadNotificationCount(response.unreadCount);
        },
        error: (err) => {
            console.error('NotificationsComponent: Erreur lors du rafraîchissement du compteur global:', err);
            this.authService.setUnreadNotificationCount(0); // Réinitialiser en cas d'erreur
        }
    });
  }

  /**
   * Marque une notification spécifique comme lue.
   * @param notification La notification à marquer.
   */
  onMarkAsRead(notification: NotificationDTO): void {
    if (notification.read || !notification.id) return;

    this.actionSub?.unsubscribe();
    this.actionSub = this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.read = true; // Mettre à jour l'état local de la notification
        this.refreshGlobalUnreadCount(); // Mettre à jour le compteur global
        this.cdr.detectChanges(); // Forcer la mise à jour de la vue
      },
      error: (err) => {
        alert('Erreur lors du marquage comme lu: ' + err.message);
      }
    });
  }

  /**
   * Marque toutes les notifications non lues comme lues.
   */
  onMarkAllAsRead(): void {
    this.actionSub?.unsubscribe();
    this.actionSub = this.notificationService.markAllAsRead().subscribe({
      next: (response) => {
        // Mettre à jour l'état local de toutes les notifications affichées
        if (this.notificationsPage?.content) {
          this.notificationsPage.content.forEach(n => n.read = true);
        }
        this.refreshGlobalUnreadCount(); // Mettre à jour le compteur global
        alert(`${response.updatedCount} notification(s) marquée(s) comme lue(s).`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        alert('Erreur lors du marquage de toutes les notifications comme lues: ' + err.message);
      }
    });
  }

  /**
   * Navigue vers une page spécifique de notifications.
   * @param pageNumber Le numéro de la page cible (base 0).
   */
  goToPage(pageNumber: number): void {
    if (this.notificationsPage && pageNumber >= 0 && pageNumber < this.notificationsPage.totalPages) {
      this.loadNotifications(pageNumber);
    }
  }

  /**
   * Génère un tableau de numéros de page pour l'affichage de la pagination.
   * @returns Un tableau de nombres représentant les pages.
   */
  getPages(): number[] {
    if (!this.notificationsPage || this.notificationsPage.totalPages <= 0) return [];
    return Array(this.notificationsPage.totalPages).fill(0).map((x, i) => i);
  }

  /**
   * Détermine le lien de navigation pour une notification, basé sur ses entités liées.
   * @param notification La notification.
   * @returns Une chaîne de caractères pour `routerLink` ou `null`.
   */
  getNotificationLink(notification: NotificationDTO): string | null {
    if (notification.relatedLogementId) {
      return `/logement/${notification.relatedLogementId}`;
    }
    if (notification.relatedProprietaireId) {
      // Note: Ce lien pointera vers le profil public du propriétaire.
      return `/proprietaires/${notification.relatedProprietaireId}`;
    }
    return null; // Pas de lien spécifique pour cette notification
  }

  /**
   * Détermine la classe d'icône Font Awesome à utiliser pour un type de notification.
   * @param type Le type de la notification (FrontendNotificationType).
   * @returns Une chaîne de classes CSS pour l'icône.
   */
  getNotificationIcon(type: FrontendNotificationType | undefined | null): string {
    if (!type) return 'fas fa-bell text-gray-400'; // Icône et couleur par défaut

    switch (type) {
        case FrontendNotificationType.NEW_LOGEMENT_FROM_PROPRIETAIRE: return 'fas fa-home-lg-alt text-blue-500';
        case FrontendNotificationType.LOGEMENT_UPDATED: return 'fas fa-edit text-yellow-500';
        case FrontendNotificationType.LOGEMENT_STATUS_CHANGED_ACTIVE: return 'fas fa-check-circle text-green-500';
        case FrontendNotificationType.LOGEMENT_STATUS_CHANGED_RESERVEE:
        case FrontendNotificationType.LOGEMENT_STATUS_CHANGED_LOUEE:
            return 'fas fa-calendar-check text-purple-500';
        case FrontendNotificationType.LOGEMENT_STATUS_CHANGED_ARCHIVEE: return 'fas fa-archive text-gray-500';
        // Ajoutez d'autres cas pour vos types de notifications
        case FrontendNotificationType.SYSTEM_MESSAGE: return 'fas fa-bullhorn text-indigo-500';
        case FrontendNotificationType.ACCOUNT_ACTIVATION: return 'fas fa-user-check text-teal-500';
        default: return 'fas fa-info-circle text-gray-400'; // Icône générique pour les types non mappés
    }
  }
}