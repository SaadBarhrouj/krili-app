package com.saadbarhrouj.krili.strategy;

import com.saadbarhrouj.krili.model.Logement;
import com.saadbarhrouj.krili.model.TypeLogement;

import java.util.List;
import java.util.stream.Collectors;

public class RechercheParType implements RechercheStrategy {
    @Override
    public List<Logement> rechercher(List<Logement> logements, RechercheCriteria criteria) {
        TypeLogement type = criteria.getType();
        if (type == null) {
            return logements;
        }
        return logements.stream()
                .filter(logement -> logement.getType() == type)
                .collect(Collectors.toList());
    }
}
