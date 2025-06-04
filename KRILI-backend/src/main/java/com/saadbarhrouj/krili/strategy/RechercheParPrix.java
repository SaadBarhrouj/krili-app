package com.saadbarhrouj.krili.strategy;

import com.saadbarhrouj.krili.model.Logement;

import java.util.List;
import java.util.stream.Collectors;

public class RechercheParPrix implements RechercheStrategy {
    @Override
    public List<Logement> rechercher(List<Logement> logements, RechercheCriteria criteria) {
        Double prixMax = criteria.getPrixMax();
        if (prixMax == null) {
            return logements;
        }
        return logements.stream()
                .filter(logement -> logement.getPrix() != null && logement.getPrix() <= prixMax)
                .collect(Collectors.toList());
    }
}
