import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ReviewCreationPayload, ReviewDTO, Page as ReviewPageType, ReviewType } from '../models/review.dto'; // Renommé Page en ReviewPageType

@Injectable({
  providedIn: 'root'
})
export class ReviewService {

  private apiUrl = 'http://localhost:8088/api';

  constructor(private http: HttpClient) { }

  creerAvis(reviewData: ReviewCreationPayload): Observable<ReviewDTO> {
    const url = `${this.apiUrl}/reviews`;
    return this.http.post<ReviewDTO>(url, reviewData).pipe(
      catchError(this.handleError)
    );
  }

  getAvisSurLogement(logementId: number, page: number = 0, size: number = 5, sort: string = 'createdAt,desc'): Observable<ReviewPageType<ReviewDTO>> {
    const url = `${this.apiUrl}/logements/${logementId}/reviews`;
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);
    return this.http.get<ReviewPageType<ReviewDTO>>(url, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getAvisSurProprietaire(proprietaireId: number, page: number = 0, size: number = 5, sort: string = 'createdAt,desc'): Observable<ReviewPageType<ReviewDTO>> {
    const url = `${this.apiUrl}/proprietaires/${proprietaireId}/reviews`;
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);
    return this.http.get<ReviewPageType<ReviewDTO>>(url, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getAvisSurEtudiant(etudiantId: number, page: number = 0, size: number = 5, sort: string = 'createdAt,desc'): Observable<ReviewPageType<ReviewDTO>> {
    const url = `${this.apiUrl}/etudiants/${etudiantId}/reviews`;
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);
    return this.http.get<ReviewPageType<ReviewDTO>>(url, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getReservationIdsEligiblesPourAvis(cibleId: number, typeAvis: ReviewType): Observable<number[]> {
    const url = `${this.apiUrl}/reviews/can-review`;
    let params = new HttpParams()
      .set('cibleId', cibleId.toString())
      .set('typeAvis', typeAvis);
    return this.http.get<number[]>(url, { params }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[ReviewService Angular] Erreur API:', error.message, error);
    let userMessage = 'Une erreur est survenue lors de l\'op??ration sur les avis.';

    if (error.error) {
      if (typeof error.error === 'string' && error.error.trim() !== '') {
        userMessage = error.error;
      } else if (typeof error.error === 'object' && error.error.message && typeof error.error.message === 'string') {
        userMessage = error.error.message;
      }
    } else if (error.message) {
        userMessage = error.message;
    }
    
    if (error.status === 0) {
      userMessage = "Impossible de joindre le serveur. Veuillez v??rifier votre connexion.";
    } else if (error.status === 404) {
      userMessage = "La ressource demand??e n'a pas ??t?? trouv??e.";
    } else if (error.status === 401 || error.status === 403) {
      userMessage = "Acc??s non autoris?? pour cette action.";
    } else if (error.status === 400 || error.status === 409) {
        userMessage = error.error?.message || "L'op??ration n'a pas pu ??tre compl??t??e (donn??es invalides ou conflit).";
    }

    return throwError(() => new Error(userMessage));
  }
}