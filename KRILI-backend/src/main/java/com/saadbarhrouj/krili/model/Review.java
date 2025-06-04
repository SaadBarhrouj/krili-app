package com.saadbarhrouj.krili.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reviews", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"reservation_id", "reviewer_id", "type"}, name = "uk_review_reservation_reviewer_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;

    @NotNull @Min(1) @Max(5) @Column(nullable = false)
    private Integer rating;

    @NotNull @Column(nullable = false, length = 2000)
    private String comment;

    @NotNull @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private Utilisateur reviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewee_user_id")
    private Utilisateur revieweeUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewee_logement_id")
    private Logement revieweeLogement;

    @NotNull @Enumerated(EnumType.STRING) @Column(nullable = false)
    private ReviewType type;

    @Column(nullable = false)
    private boolean isVisible = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum ReviewType {
        ETUDIANT_SUR_LOGEMENT,
        ETUDIANT_SUR_PROPRIETAIRE,
        PROPRIETAIRE_SUR_ETUDIANT
    }

    // UNE SEULE méthode pour @PrePersist et @PreUpdate
    @PrePersist
    @PreUpdate
    private void beforeSave() {
        if (this.id == null && this.createdAt == null) { // Initialise createdAt seulement à la création
            this.createdAt = LocalDateTime.now();
        }

        // Logique de cohérence
        if (this.reviewer == null || this.type == null) {
            throw new IllegalStateException("Reviewer and type cannot be null.");
        }
        if (this.type == ReviewType.ETUDIANT_SUR_LOGEMENT && this.revieweeLogement == null) {
            throw new IllegalStateException("For ETUDIANT_SUR_LOGEMENT review, revieweeLogement is required.");
        }
        if ((this.type == ReviewType.ETUDIANT_SUR_PROPRIETAIRE || this.type == ReviewType.PROPRIETAIRE_SUR_ETUDIANT) && this.revieweeUser == null) {
            throw new IllegalStateException("For user-targeted review, revieweeUser is required.");
        }
        if (this.type == ReviewType.ETUDIANT_SUR_LOGEMENT) {
            if (!(this.reviewer instanceof Etudiant)) {
                throw new IllegalStateException("Le reviewer doit être un Etudiant pour un avis sur un logement.");
            }
            if (this.reservation != null && this.revieweeLogement != null &&
                    !this.revieweeLogement.getId().equals(this.reservation.getLogement().getId())) {
                throw new IllegalStateException("Le logement évalué doit être celui de la réservation.");
            }
        } else if (this.type == ReviewType.ETUDIANT_SUR_PROPRIETAIRE) {
            if (!(this.reviewer instanceof Etudiant)) {
                throw new IllegalStateException("Le reviewer doit être un Etudiant pour un avis sur un propriétaire.");
            }
            if (!(this.revieweeUser instanceof Proprietaire)) {
                throw new IllegalStateException("Le revieweeUser doit être un Proprietaire pour ce type d'avis.");
            }
            if (this.reservation != null && this.reservation.getLogement() != null && this.revieweeUser != null &&
                    !this.revieweeUser.getId().equals(this.reservation.getLogement().getProprietaire().getId())) {
                throw new IllegalStateException("Le propriétaire évalué doit être celui du logement de la réservation.");
            }
        } else if (this.type == ReviewType.PROPRIETAIRE_SUR_ETUDIANT) {
            if (!(this.reviewer instanceof Proprietaire)) {
                throw new IllegalStateException("Le reviewer doit être un Proprietaire pour un avis sur un étudiant.");
            }
            if (!(this.revieweeUser instanceof Etudiant)) {
                throw new IllegalStateException("Le revieweeUser doit être un Etudiant pour ce type d'avis.");
            }
            if (this.reservation != null && this.revieweeUser != null &&
                    !this.revieweeUser.getId().equals(this.reservation.getEtudiant().getId())) {
                throw new IllegalStateException("L'étudiant évalué doit être celui de la réservation.");
            }
        }
    }
}