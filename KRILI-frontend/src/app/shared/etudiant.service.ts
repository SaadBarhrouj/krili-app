// FICHIER: KRILI-frontend\src\app\shared\etudiant.service.ts (ou un nom similaire)
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EtudiantPublicProfilDTO } from '../models/etudiant-public-profil.dto'; // Ajustez le chemin

@Injectable({
  providedIn: 'root'
})
export class EtudiantService {
  private apiUrl = 'http://localhost:8088/api/etudiants';

  constructor(private http: HttpClient) { }

  getEtudiantPublicProfil(etudiantId: number): Observable<EtudiantPublicProfilDTO> {
    const url = `${this.apiUrl}/${etudiantId}/profil-public`;
    return this.http.get<EtudiantPublicProfilDTO>(url).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[EtudiantService Angular] Erreur API:', error);
    let userMessage = 'Une erreur est survenue lors de la r??cup??ration des informations de l\'??tudiant.';
    // ... (votre logique de gestion d'erreur existante) ...
    if (error.status === 404) {
        userMessage = "Profil ??tudiant non trouv??.";
    }
    return throwError(() => new Error(userMessage));
  }
}