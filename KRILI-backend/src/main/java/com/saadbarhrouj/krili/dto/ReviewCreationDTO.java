// KRILI-backend\src\main\java\com\saadbarhrouj\krili\dto\ReviewCreationDTO.java
package com.saadbarhrouj.krili.dto;

import com.saadbarhrouj.krili.model.Review; // NÉCESSAIRE pour l'enum ReviewType
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ReviewCreationDTO {

    @NotNull(message = "L'identifiant de la réservation est obligatoire.")
    private Long reservationId;

    @NotNull(message = "La note est obligatoire.")
    @Min(value = 1, message = "La note minimale est 1.")
    @Max(value = 5, message = "La note maximale est 5.")
    private Integer rating;

    @NotBlank(message = "Le commentaire ne peut pas être vide.")
    @Size(min = 10, max = 2000, message = "Le commentaire doit contenir entre 10 et 2000 caractères.")
    private String comment;

    // === CHAMP AJOUTÉ ===
    @NotNull(message = "Le type d'avis est obligatoire.")
    private Review.ReviewType type;
    // ====================
}