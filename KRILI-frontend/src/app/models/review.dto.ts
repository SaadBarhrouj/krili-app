// src/app/models/review.dto.ts

/**
 * Type d'avis, doit correspondre à l'enum Java Review.ReviewType.
 */
export type ReviewType =
  | 'ETUDIANT_SUR_LOGEMENT'
  | 'ETUDIANT_SUR_PROPRIETAIRE'
  | 'PROPRIETAIRE_SUR_ETUDIANT';

/**
 * Interface pour les données de création d'un avis,
 * envoyées du frontend vers le backend.
 */
export interface ReviewCreationPayload {
  reservationId: number;
  rating: number; // Généralement de 1 à 5
  comment: string;
  type: ReviewType; // L'utilisateur ou le contexte UI définira ce type
}

/**
 * Interface pour les données d'un avis tel qu'il est reçu
 * du backend et utilisé pour l'affichage dans le frontend.
 */
export interface ReviewDTO {
  id: number;
  rating: number;
  comment: string;
  createdAt: string; // Les dates sont souvent transmises comme des chaînes ISO 8601
  type: ReviewType;

  // Informations sur l'auteur de l'avis (celui qui a écrit)
  reviewerId: number;
  reviewerNom: string;
  reviewerAvatarUrl?: string | null; // Sera construit par le frontend ou est déjà une URL complète

  // Informations sur la cible de l'avis (celui/ce qui est évalué)
  // Uniquement les champs pertinents seront remplis en fonction du 'type'
  revieweeUserId?: number | null;
  revieweeUserNom?: string | null;
  revieweeUserType?: 'Etudiant' | 'Proprietaire' | 'Utilisateur' | null; // Pour aider à l'affichage

  revieweeLogementId?: number | null;
  revieweeLogementAdresse?: string | null;
  revieweeLogementType?: string | null;

  // Informations sur la réservation pour contexte
  reservationId: number;
  // Exemples de champs optionnels pour la réservation :
  // reservationStartDate?: string;
  // reservationEndDate?: string;
}

/**
 * Interface générique pour la structure des réponses paginées
 * que le backend Spring Data JPA renvoie.
 */
export interface Page<T> {
  content: T[];             // Le tableau des éléments de la page actuelle
  totalPages: number;         // Nombre total de pages
  totalElements: number;      // Nombre total d'éléments sur toutes les pages
  number: number;             // Numéro de la page actuelle (commence à 0 côté backend)
  size: number;               // Taille de la page (nombre d'éléments par page)
  first?: boolean;            // True si c'est la première page
  last?: boolean;             // True si c'est la dernière page
  numberOfElements?: number;  // Nombre d'éléments dans la page actuelle
  empty?: boolean;            // True si la page est vide
  sort?: {                   // Informations de tri (optionnel)
    sorted: boolean;
    unsorted: boolean;
    empty: boolean;
  };
}