package com.saadbarhrouj.krili.repository;

import com.saadbarhrouj.krili.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    boolean existsByReservationIdAndReviewerIdAndType(Long reservationId, Long reviewerId, Review.ReviewType type);

    @Query("SELECT r FROM Review r WHERE r.revieweeLogement.id = :logementId AND r.type = 'ETUDIANT_SUR_LOGEMENT' AND r.isVisible = true ORDER BY r.createdAt DESC")
    Page<Review> findVisibleReviewsForLogement(@Param("logementId") Long logementId, Pageable pageable);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.revieweeLogement.id = :logementId AND r.type = 'ETUDIANT_SUR_LOGEMENT' AND r.isVisible = true")
    Optional<BigDecimal> calculateAverageRatingForLogement(@Param("logementId") Long logementId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.revieweeLogement.id = :logementId AND r.type = 'ETUDIANT_SUR_LOGEMENT' AND r.isVisible = true")
    long countReviewsForLogement(@Param("logementId") Long logementId);

    @Query("SELECT r FROM Review r WHERE r.revieweeUser.id = :proprietaireId AND r.type = 'ETUDIANT_SUR_PROPRIETAIRE' AND r.isVisible = true ORDER BY r.createdAt DESC")
    Page<Review> findVisibleReviewsForProprietaire(@Param("proprietaireId") Long proprietaireId, Pageable pageable);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.revieweeUser.id = :proprietaireId AND r.type = 'ETUDIANT_SUR_PROPRIETAIRE' AND r.isVisible = true")
    Optional<BigDecimal> calculateAverageRatingForProprietaire(@Param("proprietaireId") Long proprietaireId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.revieweeUser.id = :proprietaireId AND r.type = 'ETUDIANT_SUR_PROPRIETAIRE' AND r.isVisible = true")
    long countReviewsForProprietaire(@Param("proprietaireId") Long proprietaireId);

    @Query("SELECT r FROM Review r WHERE r.revieweeUser.id = :etudiantId AND r.type = 'PROPRIETAIRE_SUR_ETUDIANT' AND r.isVisible = true ORDER BY r.createdAt DESC")
    Page<Review> findVisibleReviewsForEtudiant(@Param("etudiantId") Long etudiantId, Pageable pageable);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.revieweeUser.id = :etudiantId AND r.type = 'PROPRIETAIRE_SUR_ETUDIANT' AND r.isVisible = true")
    Optional<BigDecimal> calculateAverageRatingForEtudiant(@Param("etudiantId") Long etudiantId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.revieweeUser.id = :etudiantId AND r.type = 'PROPRIETAIRE_SUR_ETUDIANT' AND r.isVisible = true")
    long countReviewsForEtudiant(@Param("etudiantId") Long etudiantId);
}
