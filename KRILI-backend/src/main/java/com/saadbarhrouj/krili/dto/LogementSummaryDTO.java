// FICHIER: KRILI-backend\src\main\java\com\saadbarhrouj\krili\dto\LogementSummaryDTO.java
package com.saadbarhrouj.krili.dto;

import lombok.Data;

@Data
public class LogementSummaryDTO {
    private Long id;
    private String adresseLigne1;
    private String type;
    private String photoPrincipaleUrl; // <= CE CHAMP EST IMPORTANT
    private Double prix;
}