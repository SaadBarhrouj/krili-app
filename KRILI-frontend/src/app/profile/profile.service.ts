// KRILI-frontend/src/app/profile/profile.service.ts // Corrected path comment
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
// Remove LogementDTO import if not used directly by ProfileService for its own methods
// import { LogementDTO } from '../logement/logement.dto'; 
import { ProfilProprietaireDTO } from './profil-proprietaire.dto'; // Assuming this DTO is used by getProprietaireProfile

@Injectable({
  providedIn: 'root'
})
export class ProfileService { // Renamed from ProprietaireService to ProfileService

  // Adjust API URL to target profile-specific endpoints for the authenticated user
  private apiUrl = 'http://localhost:8088/api/profile'; // Example: /api/profile/proprietaire

  constructor(private http: HttpClient) { }

  // Placeholder for getProprietaireProfile - IMPLEMENT THIS
  getProprietaireProfile(): Observable<ProfilProprietaireDTO> {
    return this.http.get<ProfilProprietaireDTO>(`${this.apiUrl}/proprietaire`).pipe(catchError(this.handleError));
  }

  // Placeholder for updateProprietaireProfile - IMPLEMENT THIS
  updateProprietaireProfile(formData: FormData): Observable<{ message: string, token?: string, newAvatarId?: string }> {
    return this.http.put<{ message: string, token?: string, newAvatarId?: string }>(`${this.apiUrl}/proprietaire`, formData).pipe(catchError(this.handleError));
  }

  // handleError remains similar, but adjust messages if needed
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[ProfileService Angular] Erreur API:', error);
    let userMessage = 'Une erreur est survenue lors de l\\\'opération sur le profil.';

    if (error.error) {
      if (typeof error.error === 'string' && error.error.trim() !== '') {
        userMessage = error.error;
      } else if (typeof error.error === 'object' && error.error.message && typeof error.error.message === 'string') {
        userMessage = error.error.message;
      } else if (error.message && error.status === 0) {
        userMessage = "Impossible de contacter le serveur. Veuillez vérifier votre connexion.";
      } else if (error.message) {
         userMessage = `Erreur ${error.status || ''}: ${error.message}`;
      }
    } else if (error.message) {
      userMessage = error.message;
    }

    if (error.status && error.status !== 200 && error.status !== 0) {
      if (!userMessage.includes(`(Code: ${error.status})`)) {
         userMessage += ` (Code: ${error.status})`;
      }
    }
    
    if (error.status === 404) {
        userMessage = "Profil non trouvé.";
    } else if (error.status === 401 || error.status === 403) {
        userMessage = "Accès non autorisé pour cette action sur le profil.";
    }
    // Add other specific error handling as needed

    return throwError(() => new Error(userMessage));
  }
}