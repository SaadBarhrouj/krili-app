package com.saadbarhrouj.krili.repository;

import com.saadbarhrouj.krili.model.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    Optional<Subscription> findByEtudiantIdAndProprietaireId(Long etudiantId, Long proprietaireId);

    Optional<Subscription> findByEtudiantIdAndLogementId(Long etudiantId, Long logementId);

    boolean existsByEtudiantIdAndProprietaireId(Long etudiantId, Long proprietaireId);

    boolean existsByEtudiantIdAndLogementId(Long etudiantId, Long logementId);

    List<Subscription> findByProprietaireId(Long proprietaireId);

    List<Subscription> findByLogementId(Long logementId);
    long countByProprietaireId(Long proprietaireId);
    List<Subscription> findByEtudiantIdAndLogementIsNotNull(Long etudiantId);

}