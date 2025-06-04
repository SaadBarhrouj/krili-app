package com.saadbarhrouj.krili.dto;

import lombok.Data;
import java.math.BigDecimal; // Pour les stats d'avis

@Data
public class EtudiantPublicProfilDTO {
    private Long id;
    private String nom;
    private String avatar;
    private String etablissement;
    private String filiere;
    private Integer anneeEtude;
    private String villeEtude;

    private BigDecimal avgRatingFromProprietaires;
    private Integer reviewCountFromProprietaires;

}