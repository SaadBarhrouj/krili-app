// Exemple pour KRILI-frontend\src\app\models\notification.dto.ts
// (Ajustez le chemin d'import dans les autres fichiers en conséquence)

// Enum pour les types de notification (doit correspondre à l'enum Java)
export enum FrontendNotificationType {
    NEW_LOGEMENT_FROM_PROPRIETAIRE = 'NEW_LOGEMENT_FROM_PROPRIETAIRE',
    LOGEMENT_UPDATED = 'LOGEMENT_UPDATED',
    LOGEMENT_STATUS_CHANGED_ACTIVE = 'LOGEMENT_STATUS_CHANGED_ACTIVE',
    LOGEMENT_STATUS_CHANGED_RESERVEE = 'LOGEMENT_STATUS_CHANGED_RESERVEE',
    LOGEMENT_STATUS_CHANGED_LOUEE = 'LOGEMENT_STATUS_CHANGED_LOUEE',
    LOGEMENT_STATUS_CHANGED_ARCHIVEE = 'LOGEMENT_STATUS_CHANGED_ARCHIVEE',
    RESERVATION_REQUEST = 'RESERVATION_REQUEST',
    RESERVATION_CONFIRMED = 'RESERVATION_CONFIRMED',
    NEW_REVIEW = 'NEW_REVIEW',
    SYSTEM_MESSAGE = 'SYSTEM_MESSAGE',
    ACCOUNT_ACTIVATION = 'ACCOUNT_ACTIVATION',
    PASSWORD_RESET = 'PASSWORD_RESET'
    // Ajoutez d'autres types si n??cessaire
}

export interface NotificationDTO {
  id: number;
  type: FrontendNotificationType; // Utilise l'enum TypeScript
  message: string;
  read: boolean; // Le backend utilise 'isRead', mais on peut le mapper en 'read' ici
  createdAt: string; // Les dates arrivent souvent en string ISO 8601
  relatedLogementId?: number | null;
  relatedLogementAdresse?: string | null;
  relatedProprietaireId?: number | null;
  relatedProprietaireNom?: string | null;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number; // Num??ro de la page actuelle (commence ?? 0)
  size: number;
  // Ajoutez d'autres champs de pagination si n??cessaire
}