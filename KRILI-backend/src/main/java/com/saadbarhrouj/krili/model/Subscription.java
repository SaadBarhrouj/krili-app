package com.saadbarhrouj.krili.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "subscriptions", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"etudiant_id", "proprietaire_id"}, name = "uk_subscription_etudiant_proprietaire"),
        @UniqueConstraint(columnNames = {"etudiant_id", "logement_id"}, name = "uk_subscription_etudiant_logement")
})
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "etudiant_id", nullable = false)
    private Etudiant etudiant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proprietaire_id")
    private Proprietaire proprietaire;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "logement_id")
    private Logement logement;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    @PreUpdate
    private void checkSubscriptionTarget() {
        if (proprietaire == null && logement == null) {
            throw new IllegalStateException("L'abonnement doit cibler soit un propriétaire, soit un logement.");
        }
        if (proprietaire != null && logement != null) {
            throw new IllegalStateException("L'abonnement ne peut pas cibler à la fois un propriétaire et un logement.");
        }
    }
}
