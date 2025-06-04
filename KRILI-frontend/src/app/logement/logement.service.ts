// src/app/logement/logement.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http'; // HttpErrorResponse importé
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LogementDTO } from './logement.dto';

export interface FavoriteStatus { isFavorite: boolean; }

@Injectable({
  providedIn: 'root'
})
export class LogementService {

  private apiUrl = 'http://localhost:8088/api/logements';

  constructor(private http: HttpClient) { }

  rechercherLogements(criteria: any, strategie: string): Observable<LogementDTO[]> {
    console.log('[LogementService Angular] Critères reçus pour construire HttpParams:', JSON.stringify(criteria), 'Stratégie:', strategie);
    let params = new HttpParams().set('strategie', strategie);

    // AJOUT/MODIFICATION : Logique pour ajouter les critères aux HttpParams
    if (criteria.hasOwnProperty('villeId') && criteria.villeId !== null && criteria.villeId !== undefined && !isNaN(Number(criteria.villeId))) {
      params = params.set('villeId', criteria.villeId.toString());
      console.log('[LogementService Angular] Ajout du paramètre villeId:', criteria.villeId);
    } else if (strategie === 'ville' && (criteria.villeId === null || criteria.villeId === undefined)) {
      // Si la stratégie est 'ville' mais villeId est manquant/null, il faut quand même que le backend le sache,
      // ou alors lever une erreur ici avant l'appel si villeId est obligatoire pour cette stratégie.
      // Pour l'instant, on laisse le backend gérer le cas où villeId est null pour la stratégie ville.
      // Le backend LogementController logue déjà que VilleID est null.
      console.warn('[LogementService Angular] Stratégie "ville" mais villeId est null ou undefined dans criteria.');
    }


    if (criteria.hasOwnProperty('prixMax') && criteria.prixMax !== null && criteria.prixMax >= 0) {
      params = params.set('prixMax', criteria.prixMax.toString());
      console.log('[LogementService Angular] Ajout du paramètre prixMax:', criteria.prixMax);
    }

    if (criteria.hasOwnProperty('type') && criteria.type) {
      params = params.set('type', criteria.type);
      console.log('[LogementService Angular] Ajout du paramètre type:', criteria.type);
    }

    if (criteria.hasOwnProperty('adresse') && criteria.adresse) {
      params = params.set('adresse', criteria.adresse.trim());
      console.log('[LogementService Angular] Ajout du paramètre adresse:', criteria.adresse.trim());
    }

    // Gestion pour etablissementIds (qui est un Set<number> dans criteria)
    if (criteria.hasOwnProperty('etablissementIds') && criteria.etablissementIds instanceof Set && criteria.etablissementIds.size > 0) {
      const idsArray: string[] = [];
      criteria.etablissementIds.forEach((id: number) => { // Spécifier le type number ici
        if (id !== null && id !== undefined && !isNaN(Number(id))) {
          // Spring MVC peut binder plusieurs paramètres du même nom dans un Set/List
          params = params.append('etablissementIds', Number(id).toString());
          idsArray.push(Number(id).toString()); // Pour le log
        }
      });
      if (idsArray.length > 0) {
        console.log('[LogementService Angular] Ajout des paramètres etablissementIds:', idsArray.join(', '));
      }
    }

    const url = `${this.apiUrl}/rechercher`;
    console.log(`[LogementService Angular] URL finale construite : ${url}?${params.toString()}`);
    return this.http.get<LogementDTO[]>(url, { params }).pipe(catchError(this.handleError));
  }

  getAllLogements(): Observable<LogementDTO[]> {
    console.log(`[LogementService] Appel GET : ${this.apiUrl}`);
    return this.http.get<LogementDTO[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getLogementById(id: number): Observable<LogementDTO> {
    const url = `${this.apiUrl}/${id}`;
    console.log(`[LogementService] Appel GET : ${url}`);
    return this.http.get<LogementDTO>(url).pipe(catchError(this.handleError));
  }

  getLogementsByProprietaire(): Observable<LogementDTO[]> {
    const url = `${this.apiUrl}/mes-logements`;
    console.log(`[LogementService] Appel GET : ${url} (pour proprietaire)`);
    return this.http.get<LogementDTO[]>(url).pipe(catchError(this.handleError));
  }

  createLogement(formData: FormData): Observable<LogementDTO> {
    const url = `${this.apiUrl}/creer`;
    console.log(`[LogementService] Appel POST : ${url} avec FormData`);
    return this.http.post<LogementDTO>(url, formData).pipe(catchError(this.handleError));
  }

  checkFavoriteStatus(logementId: number): Observable<FavoriteStatus> {
    const url = `${this.apiUrl}/${logementId}/favorite-status`;
    console.log(`[LogementService] Appel GET (check fav) : ${url}`);
    return this.http.get<FavoriteStatus>(url).pipe(catchError(this.handleError));
  }

  addToFavorites(logementId: number): Observable<void> {
    const url = `${this.apiUrl}/${logementId}/favorite`;
    console.log(`[LogementService] Appel POST (add fav) : ${url}`);
    return this.http.post<void>(url, {}).pipe(catchError(this.handleError));
  }

  removeFromFavorites(logementId: number): Observable<void> {
    const url = `${this.apiUrl}/${logementId}/favorite`;
    console.log(`[LogementService] Appel DELETE (remove fav) : ${url}`);
    return this.http.delete<void>(url).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> { // Typage explicite de error
    console.error('Erreur API LogementService:', error);
    let errorMessage = 'Une erreur serveur est survenue lors de l\'opération sur les logements.';
    if (error.error) {
      if (typeof error.error === 'string') { errorMessage = error.error; }
       else if (error.error.message && typeof error.error.message === 'string') { errorMessage = error.error.message; } // Vérifier type de message
       else if (error.message) { errorMessage = error.message; }
    } else if (error.message) { errorMessage = error.message; }

    if (error.status && error.status !== 200) { errorMessage += ` (Code: ${error.status})`; }

    if (error.status === 401 || error.status === 403) {
        errorMessage = `Accès non autorisé (Code: ${error.status}). Vérifiez votre connexion.`;
    }
    if (error.status === 409) {
        errorMessage = error.error?.message || "L'action est en conflit avec l'état actuel.";
    }
    return throwError(() => new Error(errorMessage));
  }

getMyFavoriteLogements(): Observable<LogementDTO[]> {
  // L'intercepteur AuthInterceptor ajoutera automatiquement le token JWT
  const url = `${this.apiUrl}/mes-favoris`; // Assurez-vous que cette URL correspond ?? votre endpoint backend
  console.log(`[LogementService] Appel GET : ${url} (pour mes favoris)`);
  return this.http.get<LogementDTO[]>(url).pipe(
    catchError(this.handleError)
  );
}


publierLogement(id: number): Observable<LogementDTO> {
  return this.http.post<LogementDTO>(`${this.apiUrl}/${id}/publier`, {}).pipe(catchError(this.handleError));
}

archiverLogement(id: number): Observable<LogementDTO> {
  return this.http.post<LogementDTO>(`${this.apiUrl}/${id}/archiver`, {}).pipe(catchError(this.handleError));
}

reserverLogement(id: number): Observable<LogementDTO> {
  // Note: Côté backend, cette action est initiée par le propriétaire sur son propre logement.
  // L'ID du propriétaire est vérifié côté backend.
  return this.http.post<LogementDTO>(`${this.apiUrl}/${id}/reserver`, {}).pipe(catchError(this.handleError));
}

confirmerLocationLogement(id: number): Observable<LogementDTO> {
  return this.http.post<LogementDTO>(`${this.apiUrl}/${id}/confirmerLocation`, {}).pipe(catchError(this.handleError));
}

remettreEnLigneLogement(id: number): Observable<LogementDTO> {
  return this.http.post<LogementDTO>(`${this.apiUrl}/${id}/remettreEnLigne`, {}).pipe(catchError(this.handleError));
}

passerEnBrouillonLogement(id: number): Observable<LogementDTO> {
  return this.http.post<LogementDTO>(`${this.apiUrl}/${id}/passerEnBrouillon`, {}).pipe(catchError(this.handleError));
}

// N'oubliez pas la méthode pour la suppression si elle n'était pas déjà là
supprimerLogement(id: number): Observable<void> {
  const url = `${this.apiUrl}/${id}`;
  console.log(`[LogementService] Appel DELETE : ${url}`);
  return this.http.delete<void>(url).pipe(catchError(this.handleError));
}

// Et la méthode pour la modification
updateLogement(id: number, logementData: LogementDTO): Observable<LogementDTO> {
  const url = `${this.apiUrl}/${id}`;
  console.log(`[LogementService] Appel PUT : ${url} avec LogementDTO`);
  return this.http.put<LogementDTO>(url, logementData).pipe(catchError(this.handleError));
}

}