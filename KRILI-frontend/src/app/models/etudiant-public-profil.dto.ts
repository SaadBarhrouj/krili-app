// FICHIER: KRILI-frontend\src\app\models\etudiant-public-profil.dto.ts (ou un emplacement similaire)
export interface EtudiantPublicProfilDTO {
  id: number;
  nom: string;
  avatar?: string | null;
  etablissement?: string | null;
  filiere?: string | null;
  anneeEtude?: number | null;
  villeEtude?: string | null;
  avgRatingFromProprietaires?: number | null;
  reviewCountFromProprietaires?: number | null;
  // dateInscription?: string;
}