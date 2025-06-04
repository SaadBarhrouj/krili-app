package com.saadbarhrouj.krili.controller;

import com.saadbarhrouj.krili.dto.DateRangeDTO;
import com.saadbarhrouj.krili.dto.DemandeReservationDTO;
import com.saadbarhrouj.krili.dto.ReservationListDTO;
import com.saadbarhrouj.krili.model.Etudiant;
import com.saadbarhrouj.krili.model.Proprietaire;
import com.saadbarhrouj.krili.model.Reservation;
import com.saadbarhrouj.krili.model.Utilisateur;
import com.saadbarhrouj.krili.service.ReservationService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import jakarta.persistence.EntityNotFoundException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private static final Logger log = LoggerFactory.getLogger(ReservationController.class);

    private final ReservationService reservationService;

    @Autowired
    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @PostMapping("/demande")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<?> creerDemandeReservation(
            @Valid @RequestBody DemandeReservationDTO demandeDto,
            @AuthenticationPrincipal Utilisateur utilisateurConnecte) {
        try {
            if (!(utilisateurConnecte instanceof Etudiant)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Seuls les étudiants peuvent faire des demandes de réservation."));
            }
            Etudiant etudiant = (Etudiant) utilisateurConnecte;
            Reservation nouvelleDemande = reservationService.creerDemandeReservation(demandeDto, etudiant);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Demande de réservation envoyée avec succès.", "reservationId", nouvelleDemande.getId()));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur lors de la création de la demande de réservation par etudiant ID {}: {}", utilisateurConnecte.getId(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur interne lors de la création de la demande."));
        }
    }

    @PostMapping("/{reservationId}/accepter")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<?> accepterDemandeReservation(
            @PathVariable Long reservationId,
            @AuthenticationPrincipal Utilisateur utilisateurConnecte) {
        try {
            if (!(utilisateurConnecte instanceof Proprietaire)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Action réservée aux propriétaires."));
            }
            Proprietaire proprietaire = (Proprietaire) utilisateurConnecte;
            Reservation reservationAcceptee = reservationService.accepterDemande(reservationId, proprietaire);
            return ResponseEntity.ok(Map.of("message", "Demande de réservation acceptée.", "reservationId", reservationAcceptee.getId(), "nouveauStatut", reservationAcceptee.getStatus()));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur lors de l'acceptation de la réservation ID {} par propriétaire ID {}: {}", reservationId, utilisateurConnecte.getId(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur interne lors de l'acceptation."));
        }
    }

    @PostMapping("/{reservationId}/refuser")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<?> refuserDemandeReservation(
            @PathVariable Long reservationId,
            @AuthenticationPrincipal Utilisateur utilisateurConnecte) {
        try {
            if (!(utilisateurConnecte instanceof Proprietaire)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Action réservée aux propriétaires."));
            }
            Proprietaire proprietaire = (Proprietaire) utilisateurConnecte;
            Reservation reservationRefusee = reservationService.refuserDemande(reservationId, proprietaire);
            return ResponseEntity.ok(Map.of("message", "Demande de réservation refusée.", "reservationId", reservationRefusee.getId(), "nouveauStatut", reservationRefusee.getStatus()));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur lors du refus de la réservation ID {} par propriétaire ID {}: {}", reservationId, utilisateurConnecte.getId(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur interne lors du refus."));
        }
    }

    @PostMapping("/{reservationId}/annuler-etudiant")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<?> annulerDemandeParEtudiant(
            @PathVariable Long reservationId,
            @AuthenticationPrincipal Utilisateur utilisateurConnecte) {
        try {
            if (!(utilisateurConnecte instanceof Etudiant)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Seuls les étudiants peuvent annuler leurs propres demandes."));
            }
            Etudiant etudiant = (Etudiant) utilisateurConnecte;
            Reservation reservationAnnulee = reservationService.annulerDemandeParEtudiant(reservationId, etudiant);
            return ResponseEntity.ok(Map.of("message", "Réservation annulée avec succès.", "reservationId", reservationAnnulee.getId(), "nouveauStatut", reservationAnnulee.getStatus()));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur lors de l'annulation de la réservation ID {} par étudiant ID {}: {}", reservationId, utilisateurConnecte.getId(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur interne lors de l'annulation."));
        }
    }

    @PostMapping("/{reservationId}/commencer-location")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<?> commencerLocation(
            @PathVariable Long reservationId,
            @AuthenticationPrincipal Utilisateur utilisateurConnecte) {
        try {
            if (!(utilisateurConnecte instanceof Proprietaire)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Action réservée aux propriétaires."));
            }
            Proprietaire proprietaire = (Proprietaire) utilisateurConnecte;
            Reservation reservationModifiee = reservationService.commencerLocation(reservationId, proprietaire);
            return ResponseEntity.ok(Map.of(
                    "message", "Location marquée comme commencée.",
                    "reservationId", reservationModifiee.getId(),
                    "nouveauStatutReservation", reservationModifiee.getStatus(),
                    "nouveauStatutLogement", reservationModifiee.getLogement().getStatut()
            ));
        } catch (ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason())); }
        catch (EntityNotFoundException e) { return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage())); }
        catch (Exception e) { log.error("Erreur commencerLocation resaID {} par proprioID {}: {}", reservationId, utilisateurConnecte.getId(), e.getMessage(), e); return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur interne.")); }
    }

    @PostMapping("/{reservationId}/terminer-location")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<?> terminerLocation(
            @PathVariable Long reservationId,
            @AuthenticationPrincipal Utilisateur utilisateurConnecte) {
        try {
            if (!(utilisateurConnecte instanceof Proprietaire)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Action réservée aux propriétaires."));
            }
            Proprietaire proprietaire = (Proprietaire) utilisateurConnecte;
            Reservation reservationModifiee = reservationService.terminerLocation(reservationId, proprietaire);
            return ResponseEntity.ok(Map.of(
                    "message", "Location marquée comme terminée.",
                    "reservationId", reservationModifiee.getId(),
                    "nouveauStatutReservation", reservationModifiee.getStatus(),
                    "nouveauStatutLogementPotentiel", reservationModifiee.getLogement().getStatut()
            ));
        } catch (ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason())); }
        catch (EntityNotFoundException e) { return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage())); }
        catch (Exception e) { log.error("Erreur terminerLocation resaID {} par proprioID {}: {}", reservationId, utilisateurConnecte.getId(), e.getMessage(), e); return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur interne.")); }
    }

    @GetMapping("/etudiant")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<List<ReservationListDTO>> getMesReservationsEtudiant(@AuthenticationPrincipal Utilisateur utilisateurConnecte) {
        if (!(utilisateurConnecte instanceof Etudiant)) {
            log.warn("Tentative d'accès à /etudiant par un non-étudiant: {}", utilisateurConnecte.getEmail());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Etudiant etudiant = (Etudiant) utilisateurConnecte;
        List<ReservationListDTO> reservationsDto = reservationService.getReservationsPourEtudiantDTO(etudiant.getId());
        return ResponseEntity.ok(reservationsDto);
    }

    @GetMapping("/proprietaire")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<List<ReservationListDTO>> getDemandesRecuesProprietaire(@AuthenticationPrincipal Utilisateur utilisateurConnecte) {
        if (!(utilisateurConnecte instanceof Proprietaire)) {
            log.warn("Tentative d'accès à /proprietaire par un non-propriétaire: {}", utilisateurConnecte.getEmail());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Proprietaire proprietaire = (Proprietaire) utilisateurConnecte;
        List<ReservationListDTO> demandesDto = reservationService.getReservationsPourProprietaireDTO(proprietaire.getId());
        return ResponseEntity.ok(demandesDto);
    }

    @GetMapping("/dates-reservees-confirmees")
    public ResponseEntity<List<DateRangeDTO>> getReservedAndConfirmedDates(@RequestParam Long logementId) {
        try {
            List<DateRangeDTO> dateRanges = reservationService.getReservedAndConfirmedDatesForLogement(logementId);
            return ResponseEntity.ok(dateRanges);
        } catch (EntityNotFoundException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage(), e);
        } catch (Exception e) {
            log.error("Erreur interne getReservedAndConfirmedDates pour logement ID {}: {}", logementId, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur serveur.", e);
        }
    }

    @GetMapping("/dates-demandes-en-attente")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<List<DateRangeDTO>> getMyPendingReservationDatesForLogement(
            @RequestParam Long logementId,
            @AuthenticationPrincipal Utilisateur utilisateurConnecte) {
        try {
            if (!(utilisateurConnecte instanceof Etudiant)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(List.of());
            }
            Etudiant etudiant = (Etudiant) utilisateurConnecte;
            List<DateRangeDTO> dateRanges = reservationService.getPendingReservationDatesForStudentAndLogement(logementId, etudiant.getId());
            return ResponseEntity.ok(dateRanges);
        } catch (EntityNotFoundException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage(), e);
        } catch (Exception e) {
            log.error("Erreur interne getMyPendingReservationDates pour logement ID {} par étudiant ID {}: {}",
                    logementId, utilisateurConnecte.getId(), e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur serveur.", e);
        }
    }
}