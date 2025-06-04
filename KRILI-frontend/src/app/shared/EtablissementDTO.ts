// src/app/shared/etablissement.dto.ts
export interface EtablissementDTO {
  id: number;
  nom: string;
  // villeId?: number; // Optionnel, si vous voulez renvoyer l'ID de la ville liée
  // typeEtablissement?: string; // Optionnel
}
