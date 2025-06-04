export interface ProfilProprietaireDTO {
  id: number | null;
  email: string;
  nom: string;
  telephone: string;
  avatar?: string | null;
  statut?: string | null;
  nomAgence?: string | null;
  siret?: string | null; 
  nombreAbonnes?: number | null;

  // Champs pour les statistiques d'avis
  avgRating?: number | null;
  reviewCount?: number | null;
}