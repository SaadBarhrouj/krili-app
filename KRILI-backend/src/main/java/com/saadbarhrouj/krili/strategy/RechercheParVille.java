package com.saadbarhrouj.krili.strategy;

import com.saadbarhrouj.krili.model.Logement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.stream.Collectors;

public class RechercheParVille implements RechercheStrategy {
    private static final Logger log = LoggerFactory.getLogger(RechercheParVille.class);

    @Override
    public List<Logement> rechercher(List<Logement> logements, RechercheCriteria criteria) {
        Long villeIdRecherchee = criteria.getVilleId();

        if (villeIdRecherchee == null) {
            log.warn("Stratégie RechercheParVille appelée sans villeId dans les critères.");
            return logements.stream()
                    .filter(l -> false)
                    .collect(Collectors.toList());
        }

        log.debug("RechercheParVille: filtrage pour villeId = {}", villeIdRecherchee);
        return logements.stream()
                .filter(logement -> logement.getVille() != null && logement.getVille().getId().equals(villeIdRecherchee))
                .collect(Collectors.toList());
    }
}
