export interface LogementDTO {
  id: number;
  adresseLigne1: string;
  codePostal?: string | null;
  nomVille?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  type: string;
  description?: string | null;
  prix: number;
  surface?: number | null;
  meuble?: boolean | null;
  nombreDePieces?: number | null;
  equipements?: string[] | null;
  nomsEtablissementsProches?: string[] | null;
  photos?: string[] | null;
  statut?: string | null;
  niveauPremium?: string | null;
  dateDisponibilite?: string | null;
  premiumStartDate?: string | null;
  premiumEndDate?: string | null;
  prochaineDateDisponibilitePotentielle?: string | null;
  proprietaireId?: number | null;
  proprietaireNom?: string | null;
  proprietaireAvatarId?: string | null;
  displayBadges?: string[];
  isFavorite?: boolean;

  avgRating?: number | null;    
  reviewCount?: number | null;  
}