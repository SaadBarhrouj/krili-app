// ========================================================================
// FICHIER: KRILI-backend\src\main\java\com\saadbarhrouj\krili\dto\LogementDTO.java
// (Mis à jour pour inclure les statistiques d'avis)
// ========================================================================
package com.saadbarhrouj.krili.dto;

import com.saadbarhrouj.krili.model.NiveauPremium;
import com.saadbarhrouj.krili.model.StatutAnnonce;
import com.saadbarhrouj.krili.model.TypeLogement;
import lombok.Getter; // Ajout de Lombok pour concision (optionnel)
import lombok.Setter; // Ajout de Lombok
import lombok.NoArgsConstructor; // Ajout de Lombok

import java.math.BigDecimal; // NÉCESSAIRE pour avgRating
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.ArrayList;

@Getter
@Setter
@NoArgsConstructor
public class LogementDTO {

    private Long id;
    private String adresseLigne1;
    private String codePostal;
    private String nomVille;
    private Double latitude;
    private Double longitude;
    private TypeLogement type;
    private String description;
    private Double prix;
    private Double surface;
    private Boolean meuble;
    private Integer nombreDePieces;
    private List<String> equipements;
    private Set<String> nomsEtablissementsProches;
    private List<String> photos;
    private StatutAnnonce statut;
    private NiveauPremium niveauPremium;
    private LocalDate dateDisponibilite;
    private LocalDate premiumStartDate;
    private LocalDate premiumEndDate;
    private LocalDate prochaineDateDisponibilitePotentielle;
    private Long proprietaireId;
    private String proprietaireNom;
    private String proprietaireAvatarId;

    private List<String> displayBadges = new ArrayList<>();

    private BigDecimal avgRating;


    private Integer reviewCount;

}