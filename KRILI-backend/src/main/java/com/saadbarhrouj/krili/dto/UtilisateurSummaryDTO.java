// FICHIER: KRILI-backend\src\main\java\com\saadbarhrouj\krili\dto\UtilisateurSummaryDTO.java
package com.saadbarhrouj.krili.dto;

import lombok.Data;

@Data
public class UtilisateurSummaryDTO {
    private Long id;
    private String nom;
    private String avatarUrl; // Optionnel: URL de l'avatar
    private String email; // Optionnel, si vous voulez afficher l'email dans la liste des r??servations
}