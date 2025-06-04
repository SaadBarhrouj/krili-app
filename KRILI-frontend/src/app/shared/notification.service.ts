// ========================================================================
// FICHIER: KRILI-frontend\src\app\shared\notification.service.ts
// RÔLE: Service Angular pour interagir avec l'API backend des notifications.
//       Fournit des méthodes pour récupérer les notifications, leur nombre,
//       et les marquer comme lues.
// ========================================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Importer NotificationDTO et FrontendNotificationType depuis le fichier centralisé des modèles/DTOs.
// Ajustez le chemin si votre fichier notification.dto.ts est ailleurs.
import { NotificationDTO, FrontendNotificationType } from '../models/notification.dto';

// Interface pour la structure des réponses paginées du backend.
// Exportée pour pouvoir être utilisée par les composants qui consomment ce service.
export interface Page<T> {
  content: T[];          // Le contenu de la page actuelle
  totalPages: number;      // Nombre total de pages disponibles
  totalElements: number;   // Nombre total d'éléments sur toutes les pages
  number: number;          // Numéro de la page actuelle (indexé à partir de 0 par Spring Data JPA)
  size: number;            // Taille de la page demandée
  // Vous pouvez ajouter d'autres propriétés de pagination si votre backend les renvoie (sort, first, last, etc.)
}

@Injectable({
  providedIn: 'root' // Service disponible globalement dans l'application
})
export class NotificationService {
  // URL de base pour l'API des notifications. À adapter si nécessaire.
  private apiUrl = 'http://localhost:8088/api/notifications';

  constructor(private http: HttpClient) { }

  /**
   * Récupère une page de notifications pour l'utilisateur actuellement authentifié.
   * @param page Le numéro de la page à récupérer (commence à 0).
   * @param size Le nombre de notifications par page.
   * @param sort Le critère de tri (ex: 'createdAt,desc' pour trier par date de création décroissante).
   * @returns Un Observable contenant un objet Page de NotificationDTO.
   */
  getMyNotifications(page: number, size: number, sort: string = 'createdAt,desc'): Observable<Page<NotificationDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    console.log(`NotificationService: Appel GET ${this.apiUrl} avec params:`, params.toString());
    return this.http.get<Page<NotificationDTO>>(this.apiUrl, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère le nombre de notifications non lues pour l'utilisateur actuellement authentifié.
   * @returns Un Observable contenant un objet avec la propriété 'unreadCount'.
   */
  getUnreadNotificationCount(): Observable<{ unreadCount: number }> {
    const url = `${this.apiUrl}/unread-count`;
    console.log(`NotificationService: Appel GET ${url}`);
    return this.http.get<{ unreadCount: number }>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Marque une notification spécifique comme lue pour l'utilisateur authentifié.
   * @param notificationId L'ID de la notification à marquer comme lue.
   * @returns Un Observable<void> indiquant la fin de l'opération.
   */
  markAsRead(notificationId: number): Observable<void> {
    const url = `${this.apiUrl}/${notificationId}/mark-as-read`;
    console.log(`NotificationService: Appel POST ${url}`);
    return this.http.post<void>(url, {}).pipe( // Le corps est vide {} car le backend ne l'attend pas pour cette action
      catchError(this.handleError)
    );
  }

  /**
   * Marque toutes les notifications non lues de l'utilisateur authentifié comme lues.
   * @returns Un Observable contenant un objet avec la propriété 'updatedCount' (le nombre de notifications mises à jour).
   */
  markAllAsRead(): Observable<{ updatedCount: number }> {
    const url = `${this.apiUrl}/mark-all-as-read`;
    console.log(`NotificationService: Appel POST ${url}`);
    return this.http.post<{ updatedCount: number }>(url, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Gestionnaire d'erreurs centralisé pour les appels HTTP de ce service.
   * @param error L'objet HttpErrorResponse reçu.
   * @returns Un Observable qui émet une nouvelle Erreur avec un message simplifié.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Erreur API dans NotificationService:', error);
    let errorMessage = 'Une erreur est survenue lors de l\'opération sur les notifications.';

    // Essayer d'extraire un message plus précis de l'erreur
    if (error.error) {
      if (typeof error.error === 'string' && error.error.trim() !== '') {
        errorMessage = error.error;
      } else if (typeof error.error === 'object' && error.error.message && typeof error.error.message === 'string') {
        errorMessage = error.error.message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Ajouter le code de statut si ce n'est pas une erreur "générique"
    if (error.status && error.status !== 0 && error.status !== 200) {
      errorMessage = `${errorMessage} (Code: ${error.status})`;
    } else if (error.status === 0) {
        errorMessage = "Impossible de contacter le serveur. Vérifiez votre connexion ou si le backend est démarré.";
    }


    return throwError(() => new Error(errorMessage));
  }
}