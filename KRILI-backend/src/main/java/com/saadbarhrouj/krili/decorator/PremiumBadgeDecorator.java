// KRILI-backend\src\main\java\com\saadbarhrouj\krili\decorator\PremiumBadgeDecorator.java
package com.saadbarhrouj.krili.decorator;

import com.saadbarhrouj.krili.model.Logement;
import com.saadbarhrouj.krili.model.NiveauPremium; // Assurez-vous de l'importer
import java.util.List;

public class PremiumBadgeDecorator extends AnnonceDecorator {

    public PremiumBadgeDecorator(AnnonceComponent annonce) {
        super(annonce);
    }

    @Override
    public List<String> getDisplayBadges() {
        List<String> badges = super.getDisplayBadges(); // R??cup??re les badges du composant envelopp??
        Logement logement = getLogementData();       // Acc??s aux donn??es brutes du logement

        if (logement.getNiveauPremium() == NiveauPremium.ULTIMATE) {
            badges.add("BADGE_ULTIMATE"); // Cl?? pour le badge Ultimate
        } else if (logement.getNiveauPremium() == NiveauPremium.PREMIUM) {
            badges.add("BADGE_PREMIUM");  // Cl?? pour le badge Premium
        }
        // Si STANDARD, on n'ajoute pas de badge sp??cifique via ce d??corateur
        return badges;
    }

    @Override
    public String getFormattedDescription() {
        // On peut garder le pr??fixe dans la description si vous le souhaitez,
        // ou le supprimer si le badge suffit.
        // Pour l'instant, gardons-le pour montrer que le d??corateur peut faire plus que juste ajouter un badge.
        String prefix = "";
        Logement logement = getLogementData();
        if (logement.getNiveauPremium() == NiveauPremium.ULTIMATE) {
            prefix = "[ULTIMATE] "; // Simple pr??fixe textuel
        } else if (logement.getNiveauPremium() == NiveauPremium.PREMIUM) {
            prefix = "[PREMIUM] ";  // Simple pr??fixe textuel
        }
        return prefix + super.getFormattedDescription();
    }
}