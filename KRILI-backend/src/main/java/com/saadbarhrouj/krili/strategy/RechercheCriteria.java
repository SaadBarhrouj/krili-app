package com.saadbarhrouj.krili.strategy;

import com.saadbarhrouj.krili.model.TypeLogement;
import java.util.Set;

public interface RechercheCriteria {
    TypeLogement getType();
    Double getPrixMax();
    String getAdresse();
    Long getVilleId();
    Set<Long> getEtablissementIds();
}
