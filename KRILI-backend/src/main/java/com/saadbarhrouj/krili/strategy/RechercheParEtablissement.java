package com.saadbarhrouj.krili.strategy;

import com.saadbarhrouj.krili.model.Etablissement;
import com.saadbarhrouj.krili.model.Logement;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class RechercheParEtablissement implements RechercheStrategy {

    @Override
    public List<Logement> rechercher(List<Logement> logements, RechercheCriteria criteria) {
        Set<Long> etablissementIdsRecherches = criteria.getEtablissementIds();

        if (etablissementIdsRecherches == null || etablissementIdsRecherches.isEmpty()) {
            return logements;
        }

        return logements.stream()
                .filter(logement -> logement.getEtablissementsProches() != null &&
                        !logement.getEtablissementsProches().isEmpty() &&
                        logement.getEtablissementsProches().stream()
                                .map(Etablissement::getId)
                                .anyMatch(etablissementIdsRecherches::contains))
                .collect(Collectors.toList());
    }
}
