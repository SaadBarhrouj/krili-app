package com.saadbarhrouj.krili.model;

public enum TypeLogement {
    STUDIO("Studio"), // Gardé
    APPARTEMENT("Appartement entier"),
    CHAMBRE_EN_COLOCATION("Chambre en colocation");

    private final String libelle;

    TypeLogement(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }
}