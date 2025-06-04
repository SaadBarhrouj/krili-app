// src/app/shared/etablissement.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// AJOUTER 'export' ICI
export interface EtablissementDTO {
  id: number;
  nom: string;
}

@Injectable({
  providedIn: 'root'
})
export class EtablissementService {
  private apiUrl = 'http://localhost:8088/api/etablissements';

  constructor(private http: HttpClient) { }

  getEtablissementsByVille(villeId: number): Observable<EtablissementDTO[]> {
    const params = new HttpParams().set('villeId', villeId.toString());
    const url = `${this.apiUrl}`;
    console.log(`[EtablissementService] Appel GET : ${url} avec params:`, params.toString());
    return this.http.get<EtablissementDTO[]>(url, { params }).pipe(
      catchError(this.handleError)
    );
  }

  // Dans KRILI-frontend\src\app\shared\etablissement.service.ts
getEtablissementById(id: number): Observable<EtablissementDTO> { // Ajoute cette méthode
  // Adapte l'URL si tu as créé un endpoint spécifique comme /id/{id}
  const url = `${this.apiUrl}/${id}`; // Ou `${this.apiUrl}/id/${id}`
  return this.http.get<EtablissementDTO>(url).pipe(catchError(this.handleError));
}

  getAllEtablissements(): Observable<EtablissementDTO[]> {
    // Cet endpoint doit exister côté backend et ne pas nécessiter de villeId
    // Il renverrait tous les établissements de la base.
    const url = `${this.apiUrl}/all`; // Exemple d'URL, à adapter à votre backend
    console.log(`[EtablissementService] Appel GET : ${url} pour tous les établissements`);
    return this.http.get<EtablissementDTO[]>(url).pipe(
      catchError(this.handleError)
    );
  }
  private handleError(error: HttpErrorResponse): Observable<never> {
    // ... (votre gestion d'erreur)
    let errorMessage = 'Une erreur inconnue est survenue lors de la récupération des établissements.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur : ${error.error.message}`;
    } else {
      errorMessage = `Erreur serveur ${error.status}: ${error.message || error.statusText}`;
    }
    console.error('[EtablissementService] Erreur API:', error);
    return throwError(() => new Error(errorMessage));
  }
}
