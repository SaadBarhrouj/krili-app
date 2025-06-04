// src/app/proprietaire/create-logement/annonce-creation.dto.ts
export interface AnnonceCreationDTO {
    adresseLigne1: string;
    codePostal: string;
    villeId: number;
    quartier?: string | null;
    typeLogement: string;
    nombreDePieces: number;
    surface: number;
    prix: number;
    meuble: boolean;
    description: string;
    equipements: string[];
    etablissementIds: number[];
    dateDisponibilite: string;
    statut: string;
    niveauPremium: string;
    latitude?: number | null;
    longitude?: number | null;
}
