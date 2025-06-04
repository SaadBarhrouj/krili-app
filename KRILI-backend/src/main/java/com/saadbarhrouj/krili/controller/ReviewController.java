// KRILI-backend\src\main\java\com\saadbarhrouj\krili\controller\ReviewController.java
package com.saadbarhrouj.krili.controller;

import com.saadbarhrouj.krili.dto.ReviewCreationDTO;
import com.saadbarhrouj.krili.dto.ReviewDTO;
import com.saadbarhrouj.krili.model.Review; // Pour l'enum
import com.saadbarhrouj.krili.model.Utilisateur;
import com.saadbarhrouj.krili.service.ReviewService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
// import java.util.Map; // Pas utilisé ici pour le moment

@RestController
@RequestMapping("/api") // Préfixe commun pour les endpoints liés aux avis
public class ReviewController {

    private static final Logger log = LoggerFactory.getLogger(ReviewController.class);
    private final ReviewService reviewService;

    @Autowired
    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    /**
     * Endpoint générique pour créer un avis.
     * L'utilisateur connecté (reviewer) et le type d'avis (dans le DTO) déterminent la cible.
     */
    @PostMapping("/reviews")
    @PreAuthorize("isAuthenticated()") // Seul un utilisateur connecté peut poster un avis
    public ResponseEntity<ReviewDTO> creerAvis(
            @AuthenticationPrincipal Utilisateur utilisateurConnecte,
            @Valid @RequestBody ReviewCreationDTO reviewCreationDto) {
        try {
            log.info("CONTROLLER: Requête POST /reviews par Utilisateur ID {} pour type d'avis {}",
                    utilisateurConnecte.getId(), reviewCreationDto.getType());

            ReviewDTO createdReview = reviewService.creerAvis(utilisateurConnecte, reviewCreationDto);
            return new ResponseEntity<>(createdReview, HttpStatus.CREATED);
        } catch (EntityNotFoundException e) {
            log.warn("CONTROLLER: Création avis échouée - Ressource non trouvée: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage(), e);
        } catch (IllegalStateException | IllegalArgumentException e) { // IllegalArgument pour type d'avis non supporté
            log.warn("CONTROLLER: Création avis échouée - Requête invalide ou état illégal: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        } catch (Exception e) {
            log.error("CONTROLLER: Erreur interne lors de la création de l'avis: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur serveur lors de la création de l'avis.", e);
        }
    }

    /**
     * Récupère les avis visibles pour un logement spécifique (public).
     */
    @GetMapping("/logements/{logementId}/reviews")
    public ResponseEntity<Page<ReviewDTO>> getAvisPourLogement(
            @PathVariable Long logementId,
            @PageableDefault(size = 5, sort = "createdAt,desc") Pageable pageable) {
        log.debug("CONTROLLER: Requête GET /logements/{}/reviews", logementId);
        try {
            Page<ReviewDTO> reviews = reviewService.getAvisSurLogement(logementId, pageable);
            return ResponseEntity.ok(reviews);
        } catch (EntityNotFoundException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage(), e);
        }
    }

    /**
     * Récupère les avis visibles laissés sur un propriétaire spécifique (public).
     */
    @GetMapping("/proprietaires/{proprietaireId}/reviews")
    public ResponseEntity<Page<ReviewDTO>> getAvisSurProprietaire(
            @PathVariable Long proprietaireId,
            @PageableDefault(size = 5, sort = "createdAt,desc") Pageable pageable) {
        log.debug("CONTROLLER: Requête GET /proprietaires/{}/reviews", proprietaireId);
        try {
            Page<ReviewDTO> reviews = reviewService.getAvisSurProprietaire(proprietaireId, pageable);
            return ResponseEntity.ok(reviews);
        } catch (EntityNotFoundException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage(), e);
        }
    }

    /**
     * Récupère les avis visibles laissés sur un étudiant spécifique (public ou protégé selon vos besoins).
     * Pour l'instant, on le laisse public.
     */
    @GetMapping("/etudiants/{etudiantId}/reviews")
    public ResponseEntity<Page<ReviewDTO>> getAvisSurEtudiant(
            @PathVariable Long etudiantId,
            @PageableDefault(size = 5, sort = "createdAt,desc") Pageable pageable) {
        log.debug("CONTROLLER: Requête GET /etudiants/{}/reviews", etudiantId);
        try {
            Page<ReviewDTO> reviews = reviewService.getAvisSurEtudiant(etudiantId, pageable);
            return ResponseEntity.ok(reviews);
        } catch (EntityNotFoundException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage(), e);
        }
    }

    /**
     * Permet à un utilisateur connecté de vérifier pour quelles réservations il peut
     * laisser un avis d'un certain type, ciblant une entité spécifique.
     *
     * @param utilisateurConnecte L'utilisateur qui souhaite laisser un avis.
     * @param cibleId L'ID de l'entité cible de l'avis (Logement ID, Propriétaire ID, ou Étudiant ID).
     * @param typeAvis Le type d'avis que l'utilisateur souhaite laisser.
     * @return Une liste d'ID de réservation éligibles.
     */
    @GetMapping("/reviews/can-review")
    @PreAuthorize("isAuthenticated()") // Seul un utilisateur connecté peut vérifier cela
    public ResponseEntity<List<Long>> getReservationsEligiblesPourAvis(
            @AuthenticationPrincipal Utilisateur utilisateurConnecte,
            @RequestParam Long cibleId,
            @RequestParam Review.ReviewType typeAvis) {

        log.debug("CONTROLLER: Vérification des réservations éligibles pour avis. Utilisateur ID: {}, Cible ID: {}, Type Avis: {}",
                utilisateurConnecte.getId(), cibleId, typeAvis);
        try {
            List<Long> reservationIds = reviewService.getReservationIdsEligiblesPourAvis(utilisateurConnecte, cibleId, typeAvis);
            return ResponseEntity.ok(reservationIds);
        } catch (EntityNotFoundException e) {
            // Si la cibleId n'existe pas (par exemple, logementId invalide)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage(), e);
        } catch (IllegalArgumentException e) {
            // Si le type d'avis ou la combinaison n'est pas supportée par le service
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        }
    }

    // TODO: Ajouter des endpoints pour la MODÉRATION des avis si nécessaire (ex: par un ADMIN)
    // @PatchMapping("/admin/reviews/{reviewId}/visibility")
    // @PreAuthorize("hasRole('ADMIN')")
    // public ResponseEntity<Void> setReviewVisibility(@PathVariable Long reviewId, @RequestParam boolean visible) { ... }
}