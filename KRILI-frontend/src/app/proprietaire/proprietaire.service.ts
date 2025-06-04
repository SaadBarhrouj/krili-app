// krili-frontend/src/app/proprietaire/proprietaire.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { LogementDTO } from '../logement/logement.dto';

// --- INTERFACE ProprietaireDetailsDTO ---
export interface ProprietaireDetailsDTO {
  id: number;
  nom: string;
  email: string;
  telephone?: string;
  nomAgence?: string;
  avatarId?: string | null; 
  logements?: LogementDTO[];
  // Add review statistics fields
  avgRating?: number | null;
  reviewCount?: number | null;
}

// --- INTERFACE SubscriptionStatus ---
export interface SubscriptionStatus { // Assurez-vous que cette interface existe
  isSubscribed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProprietaireService {

  private apiUrl = 'http://localhost:8088/api/proprietaires'; // Adaptez si besoin

  constructor(private http: HttpClient) { }

  getProprietaireDetails(id: number): Observable<ProprietaireDetailsDTO> {
    const url = `${this.apiUrl}/${id}`;
    console.log(`[ProprietaireService] Appel GET : ${url}`);
    return this.http.get<ProprietaireDetailsDTO>(url).pipe(catchError(this.handleError));
  }

  // --- Actions d'abonnement ---
  checkSubscriptionStatus(proprietaireId: number): Observable<SubscriptionStatus> {
    const url = `${this.apiUrl}/${proprietaireId}/subscription-status`;
    console.log(`[ProprietaireService] Appel GET (check sub) : ${url}`);
    // L'intercepteur ajoutera le token automatiquement si l'utilisateur est connecté
    return this.http.get<SubscriptionStatus>(url).pipe(catchError(this.handleError));
  }

  subscribeToOwner(proprietaireId: number): Observable<void> {
    const url = `${this.apiUrl}/${proprietaireId}/subscribe`;
    console.log(`[ProprietaireService] Appel POST (subscribe) : ${url}`);
    // L'intercepteur ajoutera le token. Le corps est vide {} comme attendu par le backend.
    return this.http.post<void>(url, {}).pipe(catchError(this.handleError));
  }

  unsubscribeFromOwner(proprietaireId: number): Observable<void> {
    const url = `${this.apiUrl}/${proprietaireId}/subscribe`;
    console.log(`[ProprietaireService] Appel DELETE (unsubscribe) : ${url}`);
    // L'intercepteur ajoutera le token.
    return this.http.delete<void>(url).pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('Erreur API ProprietaireService:', error);
    let errorMessage = 'Une erreur serveur est survenue.';
    // Logique d'extraction du message (similaire à votre code)
     if (error.error) {
        if (typeof error.error === 'string') { errorMessage = error.error; }
         else if (error.error.message) { errorMessage = error.error.message; }
         else if (error.message) { errorMessage = error.message; }
      } else if (error.message) { errorMessage = error.message; }

      if (error.status && error.status !== 200) {
        errorMessage = `${errorMessage} (Code: ${error.status})`;
      }
      // Gérer les cas spécifiques
      if (error.status === 401 || error.status === 403) {
          errorMessage = `Accès non autorisé (${error.status}). Veuillez vous connecter en tant qu'étudiant.`;
      }
       if (error.status === 404) {
           errorMessage = `Propriétaire non trouvé (${error.status}).`;
       }
       if (error.status === 409) { // Conflit (déjà abonné/pas abonné)
          errorMessage = error.error || "Action en conflit (ex: déjà abonné).";
      }
    // Important: Renvoyez une Erreur avec le message pour que le composant puisse l'attraper
    return throwError(() => new Error(errorMessage));
  }
}