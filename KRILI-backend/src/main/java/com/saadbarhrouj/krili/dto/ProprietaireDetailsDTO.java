// src/main/java/com/saadbarhrouj/krili/dto/ProprietaireDetailsDTO.java
package com.saadbarhrouj.krili.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal; // NÉCESSAIRE pour avgRating
import java.util.List;

/**
 * DTO pour afficher les détails publics d'un propriétaire,
 * incluant ses informations de base, la liste de ses logements actifs,
 * et ses statistiques d'avis.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProprietaireDetailsDTO {

    private Long id;
    private String nom;
    private String email; // Peut être exposé publiquement ou non, selon votre choix
    private String telephone; // Idem pour le téléphone
    private String nomAgence; // Nom de l'agence si le propriétaire en est une
    private String avatarId;  // Identifiant de l'image d'avatar du propriétaire

    private List<LogementDTO> logements; // Liste des LogementDTO (typiquement seulement les actifs)

    // --- NOUVEAUX CHAMPS POUR LES STATISTIQUES D'AVIS ---
    /**
     * Note moyenne reçue par ce propriétaire sur la base des avis visibles.
     * Peut être null si aucun avis.
     */
    private BigDecimal avgRating;

    /**
     * Nombre total d'avis visibles reçus par ce propriétaire.
     */
    private Integer reviewCount;
    // --- FIN NOUVEAUX CHAMPS ---

    // Vous pourriez ajouter d'autres informations publiques si nécessaire :
    // private LocalDate dateInscription;
    // private String descriptionProfil; // Si les proprios ont une description publique
}