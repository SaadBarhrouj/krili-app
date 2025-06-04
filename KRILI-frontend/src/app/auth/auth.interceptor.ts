// src/app/auth/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service'; // Vérifie que ce chemin est correct

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {} // Injecte AuthService pour récupérer le token

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const authToken = this.authService.getToken(); // Récupère le token depuis le service

    // Détermine si la requête va vers les endpoints d'authentification
    // Adapte ces URLs si nécessaire pour correspondre exactement à tes routes backend
    const isAuthEndpoint = request.url.includes('/api/auth/login') ||
                           request.url.includes('/api/auth/register');

    console.log(`AuthInterceptor: URL = ${request.url}, Token trouvé = ${!!authToken}, Est requête Auth = ${isAuthEndpoint}`); // Debug

    // Si on a un token ET que ce N'EST PAS une requête vers /api/auth/...
    if (authToken && !isAuthEndpoint) {
      // Clone la requête pour ajouter l'en-tête d'autorisation
      const authReq = request.clone({
        setHeaders: {
          // Ajoute l'en-tête standard "Authorization" avec le Bearer token
          Authorization: `Bearer ${authToken}`
        }
      });
      console.log('AuthInterceptor: Ajout du header Authorization.');
      // Passe la requête clonée (avec l'en-tête) au prochain handler
      return next.handle(authReq);
    } else {
      // Si pas de token ou si c'est une requête d'authentification,
      // laisse passer la requête originale sans modification
      console.log('AuthInterceptor: Pas de header ajouté.');
      return next.handle(request);
    }
  }
}