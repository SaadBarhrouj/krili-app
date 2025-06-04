// FICHIER: KRILI-frontend\src\app\shared\reservation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'; // HttpParams ajouté
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface DemandeReservationPayload {
  logementId: number;
  dateDebut: string;
  dateFin: string;
  message?: string;
}

export interface ReservationResponse {
  message: string;
  reservationId?: number;
}

export interface ReservationDateRange {
  from: string;
  to: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = 'http://localhost:8088/api/reservations';

  constructor(private http: HttpClient) { }

  creerDemandeReservation(payload: DemandeReservationPayload): Observable<ReservationResponse> {
    const url = `${this.apiUrl}/demande`;
    return this.http.post<ReservationResponse>(url, payload).pipe(
      catchError(this.handleError)
    );
  }

  accepterDemande(reservationId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${reservationId}/accepter`, {}).pipe(catchError(this.handleError));
  }

  refuserDemande(reservationId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${reservationId}/refuser`, {}).pipe(catchError(this.handleError));
  }

  annulerDemandeParEtudiant(reservationId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${reservationId}/annuler-etudiant`, {}).pipe(catchError(this.handleError));
  }

  getMesReservationsEtudiant(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/etudiant`).pipe(catchError(this.handleError));
  }

  getDemandesPourProprietaire(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/proprietaire`).pipe(catchError(this.handleError));
  }

  commencerLocation(reservationId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${reservationId}/commencer-location`, {}).pipe(catchError(this.handleError));
  }

  terminerLocation(reservationId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${reservationId}/terminer-location`, {}).pipe(catchError(this.handleError));
  }

  getConfirmedReservationDates(logementId: number): Observable<ReservationDateRange[]> {
    const url = `${this.apiUrl}/dates-reservees-confirmees`;
    const params = new HttpParams().set('logementId', logementId.toString());
    return this.http.get<ReservationDateRange[]>(url, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getMyPendingReservationDatesForLogement(logementId: number): Observable<ReservationDateRange[]> {
    const url = `${this.apiUrl}/dates-demandes-en-attente`;
    const params = new HttpParams().set('logementId', logementId.toString());
    return this.http.get<ReservationDateRange[]>(url, { params }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let userMessage = 'Une erreur est survenue lors de l\'opération sur les réservations.';
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

    if (error.status === 409) {
        userMessage = error.error?.message || "Les dates sélectionnées ne sont plus disponibles ou un conflit est survenu.";
    } else if (error.status === 400) {
        userMessage = error.error?.message || "Les informations fournies pour la réservation sont invalides.";
    } else if (error.status === 401 || error.status === 403) {
        userMessage = "Vous n'êtes pas autorisé à effectuer cette action.";
    }
    console.error('[ReservationService Angular] Erreur API traitée:', userMessage, error);
    return throwError(() => new Error(userMessage));
  }
}