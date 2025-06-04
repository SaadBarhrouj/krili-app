package com.saadbarhrouj.krili.decorator;

import com.saadbarhrouj.krili.model.Logement;
import java.util.List;

// Classe abstraite pour les décorateurs
public abstract class AnnonceDecorator implements AnnonceComponent {

    // Référence vers le composant encapsulé (peut être un ConcreteAnnonce ou un autre Decorator)
    protected AnnonceComponent wrappedAnnonce;

    public AnnonceDecorator(AnnonceComponent annonce) {
        this.wrappedAnnonce = annonce;
    }

    // Délégation par défaut aux méthodes du composant encapsulé
    @Override
    public Logement getLogementData() {
        return wrappedAnnonce.getLogementData();
    }

    @Override
    public String getFormattedDescription() {
        return wrappedAnnonce.getFormattedDescription();
    }

    @Override
    public String getFormattedPrice() {
        return wrappedAnnonce.getFormattedPrice();
    }

    @Override
    public List<String> getDisplayBadges() {
        return wrappedAnnonce.getDisplayBadges();
    }

    @Override
    public int getSearchBoostScore() {
        return wrappedAnnonce.getSearchBoostScore();
    }

    // Les classes filles surchargeront les méthodes nécessaires pour ajouter le comportement
}
