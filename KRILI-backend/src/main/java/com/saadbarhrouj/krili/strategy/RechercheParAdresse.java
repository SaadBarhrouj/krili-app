package com.saadbarhrouj.krili.strategy;

import com.saadbarhrouj.krili.model.Logement;
import java.util.List;
import java.util.stream.Collectors;

public class RechercheParAdresse implements RechercheStrategy {

    @Override
    public List<Logement> rechercher(List<Logement> logements, RechercheCriteria criteria) {
        String adresseQuery = criteria.getAdresse();
        if (adresseQuery == null || adresseQuery.trim().isEmpty()) {
            return logements;
        }
        String lowerAdresseQuery = adresseQuery.toLowerCase().trim();
        return logements.stream()
                .filter(logement ->
                        (logement.getAdresseLigne1() != null && logement.getAdresseLigne1().toLowerCase().contains(lowerAdresseQuery)) ||
                                (logement.getCodePostal() != null && logement.getCodePostal().toLowerCase().contains(lowerAdresseQuery)) ||
                                (logement.getVille() != null && logement.getVille().getNom().toLowerCase().contains(lowerAdresseQuery))
                )
                .collect(Collectors.toList());
    }
}
