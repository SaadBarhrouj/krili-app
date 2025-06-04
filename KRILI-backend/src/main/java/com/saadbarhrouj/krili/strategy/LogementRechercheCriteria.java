package com.saadbarhrouj.krili.strategy;

import com.saadbarhrouj.krili.model.TypeLogement;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.util.Set;
import java.util.HashSet;

@Getter
@Setter
@NoArgsConstructor
public class LogementRechercheCriteria implements RechercheCriteria {

    private TypeLogement type;
    private Double prixMax;
    private String adresse;
    private Long villeId;
    private Set<Long> etablissementIds = new HashSet<>();
}
