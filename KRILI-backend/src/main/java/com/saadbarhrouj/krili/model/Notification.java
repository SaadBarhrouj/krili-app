package com.saadbarhrouj.krili.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Utilisateur user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(nullable = false)
    private boolean isRead = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_logement_id")
    private Logement relatedLogement;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_proprietaire_id")
    private Proprietaire relatedProprietaire;

    public enum NotificationType {
        NEW_LOGEMENT_FROM_PROPRIETAIRE,
        LOGEMENT_UPDATED,
        LOGEMENT_STATUS_CHANGED_ACTIVE,
        LOGEMENT_STATUS_CHANGED_RESERVEE,
        LOGEMENT_STATUS_CHANGED_LOUEE,
        LOGEMENT_STATUS_CHANGED_ARCHIVEE,
        RESERVATION_REQUEST,
        RESERVATION_CONFIRMED,
        RESERVATION_REJECTED,
        RESERVATION_CANCELED_BY_ETUDIANT,
        LOCATION_STARTED,
        LOCATION_ENDED,
        NEW_REVIEW,
        SYSTEM_MESSAGE,
        ACCOUNT_ACTIVATION,
        PASSWORD_RESET
    }
}
