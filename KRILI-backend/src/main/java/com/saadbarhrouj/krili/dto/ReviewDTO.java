package com.saadbarhrouj.krili.dto;

import com.saadbarhrouj.krili.model.Review; // Pour l'enum Review.ReviewType
import lombok.Data;
import lombok.NoArgsConstructor;


import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class ReviewDTO {

    private Long id;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
    private Review.ReviewType type;

    // Informations sur l'auteur de l'avis (Reviewer)
    private Long reviewerId;
    private String reviewerNom;
    private String reviewerAvatarUrl;


    // Si l'avis est sur un Utilisateur (Propriétaire ou Étudiant)
    private Long revieweeUserId;
    private String revieweeUserNom;
    private String revieweeUserType; // "Etudiant" ou "Proprietaire" pour aider le frontend

    // Si l'avis est sur un Logement
    private Long revieweeLogementId;
    private String revieweeLogementAdresse;
    private String revieweeLogementType;    // Type du logement (STUDIO, APPARTEMENT, etc.)

    private Long reservationId;



    public ReviewDTO(Long id, Integer rating, String comment, LocalDateTime createdAt, Review.ReviewType type,
                     Long reviewerId, String reviewerNom, String reviewerAvatarUrl,
                     Long revieweeUserId, String revieweeUserNom, String revieweeUserType,
                     Long revieweeLogementId, String revieweeLogementAdresse, String revieweeLogementType,
                     Long reservationId) {
        this.id = id;
        this.rating = rating;
        this.comment = comment;
        this.createdAt = createdAt;
        this.type = type;
        this.reviewerId = reviewerId;
        this.reviewerNom = reviewerNom;
        this.reviewerAvatarUrl = reviewerAvatarUrl;
        this.revieweeUserId = revieweeUserId;
        this.revieweeUserNom = revieweeUserNom;
        this.revieweeUserType = revieweeUserType;
        this.revieweeLogementId = revieweeLogementId;
        this.revieweeLogementAdresse = revieweeLogementAdresse;
        this.revieweeLogementType = revieweeLogementType;
        this.reservationId = reservationId;
    }
}