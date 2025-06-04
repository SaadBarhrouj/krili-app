// FICHIER: KRILI-frontend\src\app\auth\auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { JwtService } from './jwt.service';
// L'import de ProfilProprietaireDTO n'est plus directement utilisé ici, CurrentUserState suffit.
// import { ProfilProprietaireDTO } from '../profile/profil-proprietaire.dto';

export interface CurrentUserState {
  id: number | null;
  nom: string;
  email: string;
  avatar?: string | null;
  telephone?: string | null;
  isLoggedIn: boolean;
  isProprietaireRole: boolean;

  etablissement?: string | number | null;
  villeEtude?: string | number | null;
  filiere?: string | null;
  anneeEtude?: number | null;

  statut?: string | null;
  nomAgence?: string | null;
  siret?: string | null;
  nombreAbonnes?: number | null;
}

export interface UpdateProfileResponse {
  message: string;
  token?: string;
  newAvatarId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8088/api/auth';
  private profileApiUrl = 'http://localhost:8088/api/profil'; // URL de base pour les endpoints de profil

  private currentUserSubject: BehaviorSubject<CurrentUserState | null>;
  public currentUser$: Observable<CurrentUserState | null>;
  private unreadNotificationsCountSubject = new BehaviorSubject<number>(0);
  public unreadNotificationsCount$ = this.unreadNotificationsCountSubject.asObservable();

  constructor(private http: HttpClient, private jwtService: JwtService) {
    this.currentUserSubject = new BehaviorSubject<CurrentUserState | null>(this.getInitialUserState());
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  private getInitialUserState(): CurrentUserState | null {
    const token = this.getToken();
    if (token) {
      try {
        const decoded = this.jwtService.decodeToken(token);
        if (decoded) {
          const isExpired = decoded.exp && (decoded.exp * 1000 < Date.now());
          if (isExpired) {
            if (typeof localStorage !== 'undefined') localStorage.removeItem('authToken');
            return null;
          }

          const isProprio = Array.isArray(decoded.roles) && decoded.roles.includes('ROLE_PROPRIETAIRE');
          const userState: CurrentUserState = {
            id: typeof decoded.userId === 'number' ? decoded.userId : null,
            nom: decoded.fullName || decoded.name || decoded.sub?.split('@')[0] || (isProprio ? 'Propriétaire' : 'Étudiant'),
            email: decoded.sub,
            avatar: decoded.avatar || null,
            telephone: decoded.telephone || null,
            etablissement: decoded.etablissement || null,
            villeEtude: decoded.villeEtude || null,
            filiere: decoded.filiere || null,
            anneeEtude: (typeof decoded.anneeEtude === 'number' || (typeof decoded.anneeEtude === 'string' && !isNaN(parseInt(decoded.anneeEtude, 10))))
                        ? parseInt(decoded.anneeEtude, 10)
                        : null,
            isLoggedIn: true,
            isProprietaireRole: isProprio,
            statut: decoded.statut || null,
            nomAgence: decoded.nomAgence || null,
            siret: decoded.siret || null,
            nombreAbonnes: typeof decoded.nombreAbonnes === 'number' ? decoded.nombreAbonnes : 0,
          };
          return userState;
        } else {
          if (typeof localStorage !== 'undefined') localStorage.removeItem('authToken');
        }
      } catch (error) {
        console.error('[AuthService] getInitialUserState: Erreur décodage/traitement token.', error);
        if (typeof localStorage !== 'undefined') localStorage.removeItem('authToken');
      }
    }
    return null;
  }

  login(credentials: any): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response && response.token) {
          this.saveTokenAndUpdateState(response.token);
        } else {
          this.clearUserState();
        }
      }),
      catchError(err => {
        this.clearUserState();
        return throwError(() => err); // Laisser le composant gérer l'affichage de l'erreur
      })
    );
  }

  registerEtudiant(etudiantData: FormData): Observable<string> {
    return this.http.post(`${this.apiUrl}/register/etudiant`, etudiantData, { responseType: 'text' }).pipe(
      catchError(this.handleError) // Utiliser handleError général
    );
  }

  registerProprietaire(proprietaireData: FormData): Observable<string> {
    return this.http.post(`${this.apiUrl}/register/proprietaire`, proprietaireData, { responseType: 'text' }).pipe(
      catchError(this.handleError) // Utiliser handleError général
    );
  }

  updateEtudiantProfile(formData: FormData): Observable<UpdateProfileResponse> {
    const url = `${this.profileApiUrl}/etudiant`;
    return this.http.patch<UpdateProfileResponse>(url, formData).pipe(
      tap(response => {
        if (response.token) {
          this.saveTokenAndUpdateState(response.token);
        } else {
          const currentState = this.currentUserSubject.value;
          if (currentState) {
            let modified = false;
            const newPartialState: Partial<CurrentUserState> = {};
            const addIfChanged = (keyFormData: string, keyState: keyof CurrentUserState, isNumeric: boolean = false) => {
              if (formData.has(keyFormData)) {
                const formVal = formData.get(keyFormData);
                const currentVal = currentState[keyState];
                let comparableFormVal = isNumeric && typeof formVal === 'string' ? Number(formVal) : formVal;
                if (formVal !== null && comparableFormVal !== currentVal) {
                  // @ts-ignore
                  newPartialState[keyState] = comparableFormVal;
                  modified = true;
                }
              }
            };
            addIfChanged('nom', 'nom');
            addIfChanged('telephone', 'telephone');
            addIfChanged('villeEtude', 'villeEtude');
            addIfChanged('etablissement', 'etablissement');
            addIfChanged('filiere', 'filiere');
            addIfChanged('anneeEtude', 'anneeEtude', true);
            if (response.newAvatarId && response.newAvatarId !== currentState.avatar) {
              newPartialState.avatar = response.newAvatarId;
              modified = true;
            }
            if (modified) {
              this.updateCurrentUserState(newPartialState);
            }
          }
        }
      }),
      catchError(this.handleError)
    );
  }

  saveTokenAndUpdateState(token: string): void {
    if (!token) {
      this.clearUserState();
      return;
    }
    if (typeof localStorage !== 'undefined') localStorage.setItem('authToken', token);
    const userStateFromNewToken = this.getInitialUserState(); // Relit depuis le nouveau token
    if (userStateFromNewToken) {
        this.currentUserSubject.next(userStateFromNewToken);
    } else {
        this.clearUserState(); // Si le nouveau token est invalide pour une raison
    }
  }

  getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  }

  removeToken(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('authToken');
    }
    this.clearUserState();
    this.setUnreadNotificationCount(0);
  }

  private clearUserState(): void {
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value?.isLoggedIn;
  }

  isCurrentUserProprietaire(): boolean {
    return !!this.currentUserSubject.value?.isProprietaireRole;
  }

  updateCurrentUserState(partialState: Partial<CurrentUserState>): void {
    const currentState = this.currentUserSubject.value;
    if (currentState) {
      const newState: CurrentUserState = {
        ...currentState,
        ...partialState,
        isLoggedIn: currentState.isLoggedIn,
        isProprietaireRole: currentState.isProprietaireRole
      };
      this.currentUserSubject.next(newState);
    }
  }

  getCurrentUserSnapshot(): CurrentUserState | null {
    return this.currentUserSubject.value;
  }

  setUnreadNotificationCount(count: number): void {
    this.unreadNotificationsCountSubject.next(count);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let userMessage = 'Une erreur est survenue.';
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
      userMessage = "Impossible de contacter le serveur. Veuillez vérifier votre connexion.";
    } else if (error.status === 400) {
        userMessage = error.error?.message || "Données invalides ou requête incorrecte.";
    } else if (error.status === 401) {
        userMessage = "Authentification requise ou session expirée.";
    } else if (error.status === 403) {
        userMessage = "Accès non autorisé pour cette action.";
    } else if (error.status === 404) {
        userMessage = "La ressource demandée n'a pas été trouvée.";
    } else if (error.status === 409) {
        userMessage = error.error?.message || "Conflit de données (ex: email déjà utilisé).";
    } else if (error.status >= 500) {
        userMessage = "Erreur interne du serveur. Veuillez réessayer plus tard.";
    }

    console.error('[AuthService] Erreur API traitée:', userMessage, error);
    return throwError(() => new Error(userMessage));
  }
}