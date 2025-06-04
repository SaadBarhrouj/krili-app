package com.saadbarhrouj.krili.strategy;

import com.saadbarhrouj.krili.model.Logement;
import java.util.List;

public interface RechercheStrategy {
    List<Logement> rechercher(List<Logement> logements, RechercheCriteria criteria);
}
