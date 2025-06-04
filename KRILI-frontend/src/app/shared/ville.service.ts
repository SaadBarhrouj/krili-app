// src/app/shared/ville.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// AJOUTER 'export' ICI
export interface VilleDTO {
  id: number;
  nom: string;
  region?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VilleService {
  private apiUrl = 'http://localhost:8088/api/villes';

  constructor(private http: HttpClient) { }

  getVilles(): Observable<VilleDTO[]> {
    console.log(`[VilleService] Appel GET : ${this.apiUrl}`);
    return this.http.get<VilleDTO[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }
  
  // Dans KRILI-frontend\src\app\shared\ville.service.ts
getVilleById(id: number): Observable<VilleDTO> { // Ajoute cette méthode
  const url = `${this.apiUrl}/${id}`;
  return this.http.get<VilleDTO>(url).pipe(catchError(this.handleError));
}

  private handleError(error: HttpErrorResponse): Observable<never> {
    // ... (votre gestion d'erreur)
    let errorMessage = 'Une erreur inconnue est survenue lors de la récupération des villes.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur : ${error.error.message}`;
    } else {
      errorMessage = `Erreur serveur ${error.status}: ${error.message || error.statusText}`;
    }
    console.error('[VilleService] Erreur API:', error);
    return throwError(() => new Error(errorMessage));
  }
}
