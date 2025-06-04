// KRILI-backend\src\main\java\com\saadbarhrouj\krili\decorator\NouveauteBadgeDecorator.java
package com.saadbarhrouj.krili.decorator;

import com.saadbarhrouj.krili.model.Logement;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

public class NouveauteBadgeDecorator extends AnnonceDecorator {

    public NouveauteBadgeDecorator(AnnonceComponent annonce) {
        super(annonce);
    }

    @Override
    public List<String> getDisplayBadges() {
        List<String> badges = super.getDisplayBadges();
        Logement logement = getLogementData();

        // Utiliser une date de r??f??rence pertinente. dateDisponibilite est un bon candidat si
        // les logements sont souvent mis comme disponibles juste avant leur publication.
        // Sinon, il faudrait une dateCreation ou datePublication sur l'entit?? Logement.
        LocalDate dateReference = logement.getDateDisponibilite();
        if (dateReference != null) {
            // Est consid??r?? comme "nouveau" si la date de disponibilit?? est dans le futur
            // OU si elle est dans les 7 derniers jours.
            // Cela couvre les annonces qui viennent d'??tre publi??es m??me si la dispo est imm??diate.
            if (dateReference.isAfter(LocalDate.now()) || ChronoUnit.DAYS.between(dateReference, LocalDate.now()) <= 7) {
                badges.add("BADGE_NOUVEAUTE");
            }
        }
        return badges;
    }
}