// Fichier: src/app/shared/reservation.tooltip.ts
/**
 * Fonction utilitaire pour ajouter des informations contextuelles sur le fonctionnement des réservations
 * à destination des utilisateurs du site.
 */
export const ReservationTooltips = {
  /**
   * Obtenir un texte explicatif pour l'info-bulle du calendrier
   */
  getCalendarTooltip(): string {
    return 'Plusieurs étudiants peuvent demander les mêmes dates tant qu\'aucune demande n\'a été confirmée par le propriétaire.';
  },
  
  /**
   * Obtenir un message d'aide pour le fonctionnement des réservations
   */
  getReservationHelp(): string {
    return 'Le propriétaire confirme ou refuse les demandes de réservation. Une fois une demande confirmée, les dates concernées ne sont plus disponibles pour les autres étudiants.';
  }
};
