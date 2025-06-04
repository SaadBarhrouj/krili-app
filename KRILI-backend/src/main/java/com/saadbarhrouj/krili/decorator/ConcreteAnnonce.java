package com.saadbarhrouj.krili.decorator;

import com.saadbarhrouj.krili.model.Logement;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

// Implémentation de base qui encapsule un Logement
public class ConcreteAnnonce implements AnnonceComponent {
    private Logement logement;

    public ConcreteAnnonce(Logement logement) {
        if (logement == null) {
            throw new IllegalArgumentException("Logement ne peut pas être null");
        }
        this.logement = logement;
    }

    @Override
    public Logement getLogementData() {
        return this.logement;
    }

    @Override
    public String getFormattedDescription() {
        // Logique de base pour la description
        return logement.getDescription() != null ? logement.getDescription() : "Aucune description.";
    }

    @Override
    public String getFormattedPrice() {
        // Logique de base pour le prix
        if (logement.getPrix() == null) return "Prix non spécifié";
        // Format simple, pourrait être plus complexe (Locale, devise)
        return String.format(Locale.FRANCE, "%.2f €", logement.getPrix());
    }

    @Override
    public List<String> getDisplayBadges() {
        // Pas de badge par défaut
        return new ArrayList<>();
    }

    @Override
    public int getSearchBoostScore() {
        // Score de base
        return 0;
    }
}