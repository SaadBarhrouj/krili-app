// src/app/auth/jwt.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root' // Rend le service disponible partout dans l'app
})
export class JwtService {

  constructor() { }

  /**
   * Décode la partie Payload d'un token JWT.
   * ATTENTION : Ne vérifie PAS la signature ni l'expiration !
   * Pour une utilisation en production, préférez une librairie comme jwt-decode.
   * @param token Le token JWT sous forme de chaîne.
   * @returns L'objet contenu dans le payload, ou null si le décodage échoue.
   */
  decodeToken(token: string): any | null {
    if (!token) {
      console.error("Tentative de décodage d'un token null ou vide.");
      return null;
    }

    try {
      // 1. Sépare le token en ses 3 parties (header.payload.signature)
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Le token JWT est invalide (ne contient pas 3 parties)');
      }

      // 2. Prend la partie du milieu (le payload)
      const payloadBase64Url = parts[1];

      // 3. Remplace les caractères non compatibles avec Base64 standard
      const base64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');

      // 4. Décode la chaîne Base64
      //    atob() décode une chaîne Base64.
      //    Le résultat peut contenir des caractères non-ASCII, qu'il faut URI-décoder.
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(function(c) {
            // Convertit chaque caractère en sa représentation hexadécimale URI (%XX)
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );

      // 5. Parse la chaîne JSON obtenue
      return JSON.parse(jsonPayload);

    } catch (error) {
      console.error("Erreur lors du décodage du token JWT:", error);
      return null; // Retourne null en cas d'erreur
    }
  }

  // --- Fonctions potentielles à ajouter plus tard ---

  // Exemple: Vérifier si le token est expiré (nécessite le décodage)
  /*
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true; // Considéré comme expiré si pas décodable ou sans date d'expiration
    }
    const expirationDate = new Date(0); // Epoch
    expirationDate.setUTCSeconds(decoded.exp);
    return expirationDate.valueOf() < new Date().valueOf();
  }
  */

}
