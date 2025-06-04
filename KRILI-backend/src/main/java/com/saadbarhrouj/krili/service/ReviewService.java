package com.saadbarhrouj.krili.service;

import com.saadbarhrouj.krili.dto.ReviewCreationDTO;
import com.saadbarhrouj.krili.dto.ReviewDTO;
import com.saadbarhrouj.krili.model.*;
import com.saadbarhrouj.krili.repository.*;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.saadbarhrouj.krili.model.Review.ReviewType.*;

@Service
public class ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewService.class);

    private final ReviewRepository reviewRepository;
    private final ReservationRepository reservationRepository;
    private final LogementRepository logementRepository;
    private final ProprietaireRepository proprietaireRepository;
    private final EtudiantRepository etudiantRepository;
    private final UtilisateurRepository utilisateurRepository;

    @Autowired
    public ReviewService(ReviewRepository reviewRepository,
                         ReservationRepository reservationRepository,
                         LogementRepository logementRepository,
                         ProprietaireRepository proprietaireRepository,
                         EtudiantRepository etudiantRepository,
                         UtilisateurRepository utilisateurRepository) {
        this.reviewRepository = reviewRepository;
        this.reservationRepository = reservationRepository;
        this.logementRepository = logementRepository;
        this.proprietaireRepository = proprietaireRepository;
        this.etudiantRepository = etudiantRepository;
        this.utilisateurRepository = utilisateurRepository;
    }

    @Transactional
    public ReviewDTO creerAvis(Utilisateur reviewerConnecte, ReviewCreationDTO creationDto) {
        log.info("SERVICE: Création avis par Utilisateur ID {} de type {}", reviewerConnecte.getId(), creationDto.getType());

        Reservation reservation = reservationRepository.findById(creationDto.getReservationId())
                .orElseThrow(() -> new EntityNotFoundException("Réservation non trouvée avec ID: " + creationDto.getReservationId()));

        if (reviewRepository.existsByReservationIdAndReviewerIdAndType(reservation.getId(), reviewerConnecte.getId(), creationDto.getType())) {
            throw new IllegalStateException("Un avis de ce type par cet utilisateur existe déjà pour cette réservation.");
        }

        if (!isReservationStatusEligibleForReview(reservation.getStatus())) {
            throw new IllegalStateException("Statut de réservation ("+ reservation.getStatus() +") non éligible pour un avis.");
        }

        Review review = Review.builder()
                .reservation(reservation)
                .rating(creationDto.getRating())
                .comment(creationDto.getComment())
                .reviewer(reviewerConnecte)
                .type(creationDto.getType())
                .isVisible(true)
                .build();

        switch (creationDto.getType()) {
            case ETUDIANT_SUR_LOGEMENT:
                if (!(reviewerConnecte instanceof Etudiant)) throw new IllegalStateException("Seul un étudiant peut évaluer un logement.");
                review.setRevieweeLogement(reservation.getLogement());
                break;
            case ETUDIANT_SUR_PROPRIETAIRE:
                if (!(reviewerConnecte instanceof Etudiant)) throw new IllegalStateException("Seul un étudiant peut évaluer un propriétaire.");
                review.setRevieweeUser(reservation.getLogement().getProprietaire());
                break;
            case PROPRIETAIRE_SUR_ETUDIANT:
                if (!(reviewerConnecte instanceof Proprietaire)) throw new IllegalStateException("Seul un propriétaire peut évaluer un étudiant.");
                if (!reviewerConnecte.getId().equals(reservation.getLogement().getProprietaire().getId())) {
                    throw new IllegalStateException("Seul le propriétaire du logement de la réservation peut évaluer l'étudiant.");
                }
                review.setRevieweeUser(reservation.getEtudiant());
                break;
            default:
                throw new IllegalArgumentException("Type d'avis non supporté: " + creationDto.getType());
        }

        Review savedReview = reviewRepository.save(review);
        log.info("Avis ID {} (type {}) créé.", savedReview.getId(), savedReview.getType());

        if (savedReview.getRevieweeLogement() != null) {
            mettreAJourStatistiquesAvisLogement(savedReview.getRevieweeLogement());
        }
        if (savedReview.getRevieweeUser() != null) {
            mettreAJourStatistiquesAvisUtilisateur(savedReview.getRevieweeUser());
        }

        return convertToDto(savedReview);
    }

    @Transactional(readOnly = true)
    public Page<ReviewDTO> getAvisSurLogement(Long logementId, Pageable pageable) {
        log.debug("SERVICE: Récupération avis pour Logement ID {}", logementId);
        if (!logementRepository.existsById(logementId)) {
            throw new EntityNotFoundException("Logement non trouvé avec ID: " + logementId);
        }
        Page<Review> reviewsPage = reviewRepository.findVisibleReviewsForLogement(logementId, pageable);
        return reviewsPage.map(this::convertToDto);
    }

    @Transactional(readOnly = true)
    public Page<ReviewDTO> getAvisSurProprietaire(Long proprietaireId, Pageable pageable) {
        log.debug("SERVICE: Récupération avis sur Propriétaire ID {}", proprietaireId);
        if (!proprietaireRepository.existsById(proprietaireId)) {
            throw new EntityNotFoundException("Propriétaire non trouvé avec ID: " + proprietaireId);
        }
        Page<Review> reviewsPage = reviewRepository.findVisibleReviewsForProprietaire(proprietaireId, pageable);
        return reviewsPage.map(this::convertToDto);
    }

    @Transactional(readOnly = true)
    public Page<ReviewDTO> getAvisSurEtudiant(Long etudiantId, Pageable pageable) {
        log.debug("SERVICE: Récupération avis sur Étudiant ID {}", etudiantId);
        if (!etudiantRepository.existsById(etudiantId)) {
            throw new EntityNotFoundException("Étudiant non trouvé avec ID: " + etudiantId);
        }
        Page<Review> reviewsPage = reviewRepository.findVisibleReviewsForEtudiant(etudiantId, pageable);
        return reviewsPage.map(this::convertToDto);
    }

    @Transactional
    public void mettreAJourStatistiquesAvisLogement(Logement logement) {
        Objects.requireNonNull(logement, "Logement ne peut être null.");
        Objects.requireNonNull(logement.getId(), "ID du Logement ne peut être null.");
        log.debug("SERVICE: Mise à jour stats avis pour Logement ID: {}", logement.getId());

        BigDecimal avgRating = reviewRepository.calculateAverageRatingForLogement(logement.getId())
                .map(avg -> avg.setScale(2, RoundingMode.HALF_UP))
                .orElse(BigDecimal.ZERO);
        long reviewCount = reviewRepository.countReviewsForLogement(logement.getId());

        logement.setAvgRating(avgRating);
        logement.setReviewCount((int) reviewCount);
        logementRepository.save(logement);
        log.info("SERVICE: Stats Logement ID {} MAJ: Note Moyenne = {}, Nb Avis = {}", logement.getId(), avgRating, reviewCount);
    }

    @Transactional
    public void mettreAJourStatistiquesAvisUtilisateur(Utilisateur utilisateur) {
        Objects.requireNonNull(utilisateur, "Utilisateur ne peut être null.");
        Objects.requireNonNull(utilisateur.getId(), "ID de l'Utilisateur ne peut être null.");
        log.debug("SERVICE: Mise à jour stats avis pour Utilisateur ID: {}", utilisateur.getId());

        Optional<BigDecimal> avgRatingOptional;
        long reviewCount;

        if (utilisateur instanceof Proprietaire) {
            avgRatingOptional = reviewRepository.calculateAverageRatingForProprietaire(utilisateur.getId());
            reviewCount = reviewRepository.countReviewsForProprietaire(utilisateur.getId());
        } else if (utilisateur instanceof Etudiant) {
            avgRatingOptional = reviewRepository.calculateAverageRatingForEtudiant(utilisateur.getId());
            reviewCount = reviewRepository.countReviewsForEtudiant(utilisateur.getId());
        } else {
            log.warn("Type d'utilisateur non géré pour les statistiques d'avis: {}", utilisateur.getClass().getSimpleName());
            return;
        }

        BigDecimal avgRating = avgRatingOptional
                .map(avg -> avg.setScale(2, RoundingMode.HALF_UP))
                .orElse(BigDecimal.ZERO);

        utilisateur.setAvgRating(avgRating);
        utilisateur.setReviewCount((int) reviewCount);
        utilisateurRepository.save(utilisateur); // Sauvegarde via le repo Utilisateur
        log.info("SERVICE: Stats Utilisateur ID {} ({}) MAJ: Note Moyenne = {}, Nb Avis = {}",
                utilisateur.getId(), utilisateur.getClass().getSimpleName() , avgRating, reviewCount);
    }

    @Transactional(readOnly = true)
    public List<Long> getReservationIdsEligiblesPourAvis(Utilisateur utilisateurConnecte, Long cibleId, Review.ReviewType typeAvis) {
        if (utilisateurConnecte == null || cibleId == null || typeAvis == null) {
            return List.of();
        }

        List<Reservation> reservations;
        if (typeAvis == ETUDIANT_SUR_LOGEMENT) {
            if (!(utilisateurConnecte instanceof Etudiant)) return List.of();
            reservations = reservationRepository.findByEtudiantIdAndLogementId(utilisateurConnecte.getId(), cibleId);
        } else if (typeAvis == ETUDIANT_SUR_PROPRIETAIRE) {
            if (!(utilisateurConnecte instanceof Etudiant)) return List.of();
            reservations = reservationRepository.findByEtudiantIdAndLogementProprietaireId(utilisateurConnecte.getId(), cibleId);
        } else if (typeAvis == PROPRIETAIRE_SUR_ETUDIANT) {
            if (!(utilisateurConnecte instanceof Proprietaire)) return List.of();
            reservations = reservationRepository.findByProprietaireIdAndEtudiantId(utilisateurConnecte.getId(), cibleId);
        } else {
            return List.of();
        }

        return reservations.stream()
                .filter(res -> isReservationStatusEligibleForReview(res.getStatus()) &&
                        !reviewRepository.existsByReservationIdAndReviewerIdAndType(res.getId(), utilisateurConnecte.getId(), typeAvis))
                .map(Reservation::getId)
                .collect(Collectors.toList());
    }

    private boolean isReservationStatusEligibleForReview(Reservation.ReservationStatus status) {
        return status == Reservation.ReservationStatus.COMPLETED ||
                status == Reservation.ReservationStatus.ONGOING ||
                status == Reservation.ReservationStatus.CONFIRMED;
    }

    private ReviewDTO convertToDto(Review review) {
        if (review == null) return null;

        Utilisateur reviewer = review.getReviewer();
        Utilisateur revieweeUser = review.getRevieweeUser();
        Logement revieweeLogement = review.getRevieweeLogement();
        Reservation reservation = review.getReservation();

        ReviewDTO dto = new ReviewDTO();
        dto.setId(review.getId());
        dto.setRating(review.getRating());
        dto.setComment(review.getComment());
        dto.setCreatedAt(review.getCreatedAt());
        dto.setType(review.getType());

        if (reviewer != null) {
            dto.setReviewerId(reviewer.getId());
            dto.setReviewerNom(reviewer.getNom());
            dto.setReviewerAvatarUrl(reviewer.getAvatar());
        }

        if (revieweeUser != null) {
            dto.setRevieweeUserId(revieweeUser.getId());
            dto.setRevieweeUserNom(revieweeUser.getNom());
            dto.setRevieweeUserType(revieweeUser instanceof Etudiant ? "Etudiant" : (revieweeUser instanceof Proprietaire ? "Proprietaire" : "Utilisateur"));
        }

        if (revieweeLogement != null) {
            dto.setRevieweeLogementId(revieweeLogement.getId());
            dto.setRevieweeLogementAdresse(revieweeLogement.getAdresseLigne1());
        }

        if (reservation != null) {
            dto.setReservationId(reservation.getId());
            if (reservation.getLogement() != null && revieweeLogement == null && review.getType() != ETUDIANT_SUR_LOGEMENT) {
                dto.setRevieweeLogementId(reservation.getLogement().getId());
                dto.setRevieweeLogementAdresse(reservation.getLogement().getAdresseLigne1());
            }
        }
        return dto;
    }
}