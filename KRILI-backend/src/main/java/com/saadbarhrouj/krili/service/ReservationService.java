package com.saadbarhrouj.krili.service;

import com.saadbarhrouj.krili.dto.DateRangeDTO;
import com.saadbarhrouj.krili.dto.DemandeReservationDTO;
import com.saadbarhrouj.krili.dto.LogementSummaryDTO;
import com.saadbarhrouj.krili.dto.ReservationListDTO;
import com.saadbarhrouj.krili.dto.UtilisateurSummaryDTO;
import com.saadbarhrouj.krili.model.*;
import com.saadbarhrouj.krili.model.state.ActiveState;
import com.saadbarhrouj.krili.model.state.RentedState;
import com.saadbarhrouj.krili.model.state.ReservedState;
import com.saadbarhrouj.krili.repository.LogementRepository;
import com.saadbarhrouj.krili.repository.ReservationRepository;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ReservationService {

    private static final Logger log = LoggerFactory.getLogger(ReservationService.class);

    private final ReservationRepository reservationRepository;
    private final LogementRepository logementRepository;
    private final NotificationCreationService notificationCreationService;

    @Autowired
    public ReservationService(ReservationRepository reservationRepository,
                              LogementRepository logementRepository,
                              NotificationCreationService notificationCreationService) {
        this.reservationRepository = reservationRepository;
        this.logementRepository = logementRepository;
        this.notificationCreationService = notificationCreationService;
    }

    @Transactional
    public Reservation creerDemandeReservation(DemandeReservationDTO demandeDto, Etudiant etudiant) {
        Objects.requireNonNull(demandeDto, "Le DTO de demande de réservation ne peut être null.");
        Objects.requireNonNull(etudiant, "L'étudiant ne peut être null.");
        // ... (autres validations null)

        if (demandeDto.getDateFin().isBefore(demandeDto.getDateDebut()) || demandeDto.getDateFin().isEqual(demandeDto.getDateDebut())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La date de fin doit être postérieure à la date de début.");
        }

        Logement logement = logementRepository.findById(demandeDto.getLogementId())
                .orElseThrow(() -> new EntityNotFoundException("Logement non trouvé avec ID: " + demandeDto.getLogementId()));

        if (logement.getStatut() != StatutAnnonce.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce logement n'est actuellement pas disponible (statut: " + logement.getStatut() + ").");
        }

        // Vérification 1: Chevauchement avec des réservations CONFIRMED ou ONGOING (pour tous les utilisateurs)
        // UTILISER LA NOUVELLE MÉTHODE DU REPOSITORY ICI
        List<Reservation> conflitsIndisponibles = reservationRepository.findUnavailableOverlappingReservations(
                logement.getId(), demandeDto.getDateDebut(), demandeDto.getDateFin());

        if (!conflitsIndisponibles.isEmpty()) {
            log.warn("Conflit de dates (confirmées/en cours rendant indisponible) pour le logement ID: {}. Dates demandées: {} -> {}.",
                    logement.getId(), demandeDto.getDateDebut(), demandeDto.getDateFin());
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Logement indisponible pour les dates sélectionnées (déjà réservé et confirmé/en cours).");
        }

        // Vérification 2: Si l'étudiant actuel a déjà une demande PENDING pour ces dates sur ce logement
        List<Reservation> demandesSimilairesEnAttentePourCetEtudiant = reservationRepository.findExistingPendingRequestsForStudentOnDates(
                logement.getId(),
                etudiant.getId(),
                demandeDto.getDateDebut(),
                demandeDto.getDateFin()
        );

        if (!demandesSimilairesEnAttentePourCetEtudiant.isEmpty()) {
            log.warn("L'étudiant ID {} a déjà une demande en attente pour le logement ID {} sur des dates qui se chevauchent ({} -> {}).",
                    etudiant.getId(), logement.getId(), demandeDto.getDateDebut(), demandeDto.getDateFin());
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vous avez déjà une demande en attente pour ce logement sur ces dates ou des dates qui se chevauchent.");
        }

        // Si on arrive ici, c'est que :
        // 1. Il n'y a pas de réservation CONFIRMED ou ONGOING qui bloque ces dates pour tout le monde.
        // 2. CET étudiant n'a pas de demande PENDING qui bloque ces dates pour LUI.
        // Donc, il peut faire sa demande.

        Reservation reservation = Reservation.builder()
                .etudiant(etudiant)
                .logement(logement)
                .proprietaire(logement.getProprietaire())
                .startDate(demandeDto.getDateDebut())
                .endDate(demandeDto.getDateFin())
                .status(Reservation.ReservationStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .messageEtudiant(demandeDto.getMessage())
                .build();

        Reservation savedReservation = reservationRepository.save(reservation);

        String messageNotif = String.format("Nouvelle demande de %s pour '%s' (%s - %s).",
                etudiant.getNom(),
                logement.getAdresseLigne1() != null ? logement.getAdresseLigne1() : "Logement ID " + logement.getId(),
                demandeDto.getDateDebut().toString(), demandeDto.getDateFin().toString());
        notificationCreationService.createNotificationForUser(logement.getProprietaire(), Notification.NotificationType.RESERVATION_REQUEST, messageNotif, logement, null);

        return savedReservation;
    }


    @Transactional
    public Reservation accepterDemande(Long reservationId, Proprietaire proprietaireConnecte) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Réservation non trouvée avec ID: " + reservationId));

        if (!reservation.getLogement().getProprietaire().getId().equals(proprietaireConnecte.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Action non autorisée.");
        }
        if (reservation.getStatus() != Reservation.ReservationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Demande non acceptable (statut: " + reservation.getStatus() + ").");
        }

        List<Reservation> conflits = reservationRepository.findOverlappingReservations(
                reservation.getLogement().getId(), reservation.getStartDate(), reservation.getEndDate());
        if (conflits.stream().anyMatch(r -> !r.getId().equals(reservationId) && r.getStatus() == Reservation.ReservationStatus.CONFIRMED)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Logement non disponible (conflit avec une autre réservation confirmée).");
        }

        reservation.setStatus(Reservation.ReservationStatus.CONFIRMED);
        Logement logement = reservation.getLogement();
        logement.setInternalState(new ReservedState());
        logementRepository.save(logement);

        Reservation updatedReservation = reservationRepository.save(reservation);

        String messageNotifEtudiant = String.format("Votre demande pour '%s' a été acceptée !",
                logement.getAdresseLigne1() != null ? logement.getAdresseLigne1() : "un logement");
        notificationCreationService.createNotificationForUser(reservation.getEtudiant(), Notification.NotificationType.RESERVATION_CONFIRMED, messageNotifEtudiant, logement, proprietaireConnecte);

        return updatedReservation;
    }

    @Transactional
    public Reservation refuserDemande(Long reservationId, Proprietaire proprietaireConnecte) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Réservation non trouvée avec ID: " + reservationId));

        if (!reservation.getLogement().getProprietaire().getId().equals(proprietaireConnecte.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Action non autorisée.");
        }
        if (reservation.getStatus() != Reservation.ReservationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Demande non refusable (statut: " + reservation.getStatus() + ").");
        }

        reservation.setStatus(Reservation.ReservationStatus.CANCELED_BY_PROPRIETAIRE);
        Reservation updatedReservation = reservationRepository.save(reservation);

        String messageNotifEtudiant = String.format("Votre demande pour '%s' a été refusée.",
                reservation.getLogement().getAdresseLigne1() != null ? reservation.getLogement().getAdresseLigne1() : "un logement");
        notificationCreationService.createNotificationForUser(reservation.getEtudiant(), Notification.NotificationType.RESERVATION_REJECTED, messageNotifEtudiant, reservation.getLogement(), proprietaireConnecte);

        return updatedReservation;
    }

    @Transactional
    public Reservation annulerDemandeParEtudiant(Long reservationId, Etudiant etudiantConnecte) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Réservation non trouvée avec ID: " + reservationId));

        if (!reservation.getEtudiant().getId().equals(etudiantConnecte.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Action non autorisée.");
        }
        if (reservation.getStatus() != Reservation.ReservationStatus.PENDING && reservation.getStatus() != Reservation.ReservationStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Réservation non annulable par vous (statut: " + reservation.getStatus() + ").");
        }

        Reservation.ReservationStatus statutPrecedent = reservation.getStatus();
        reservation.setStatus(Reservation.ReservationStatus.CANCELED_BY_ETUDIANT);
        Reservation updatedReservation = reservationRepository.save(reservation);

        if (statutPrecedent == Reservation.ReservationStatus.CONFIRMED) {
            Logement logement = reservation.getLogement();
            boolean hasOtherConfirmedOrOngoing = reservationRepository
                    .findByLogementIdOrderByStartDateDesc(logement.getId())
                    .stream()
                    .anyMatch(r -> !r.getId().equals(reservationId) &&
                            (r.getStatus() == Reservation.ReservationStatus.CONFIRMED || r.getStatus() == Reservation.ReservationStatus.ONGOING));
            if (!hasOtherConfirmedOrOngoing && logement.getStatut() == StatutAnnonce.RESERVEE) {
                logement.setInternalState(new ActiveState());
                logementRepository.save(logement);
                notificationCreationService.notifyLogementUpdate(logement, Notification.NotificationType.LOGEMENT_STATUS_CHANGED_ACTIVE,
                        String.format("Le logement '%s' est de nouveau disponible.", logement.getAdresseLigne1() != null ? logement.getAdresseLigne1() : "ID " + logement.getId()));
            }
        }

        String messageNotifProprio = String.format("%s a annulé sa demande/réservation pour '%s'.",
                etudiantConnecte.getNom(), reservation.getLogement().getAdresseLigne1() != null ? reservation.getLogement().getAdresseLigne1() : "ID " + reservation.getLogement().getId());
        notificationCreationService.createNotificationForUser(reservation.getProprietaire(), Notification.NotificationType.RESERVATION_CANCELED_BY_ETUDIANT, messageNotifProprio, reservation.getLogement(), null);

        return updatedReservation;
    }

    @Transactional(readOnly = true)
    public List<ReservationListDTO> getReservationsPourEtudiantDTO(Long etudiantId) {
        List<Reservation> reservations = reservationRepository.findByEtudiantIdOrderByStartDateDesc(etudiantId);
        return reservations.stream()
                .map(this::convertToReservationListDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReservationListDTO> getReservationsPourProprietaireDTO(Long proprietaireId) {
        List<Reservation> reservations = reservationRepository.findByProprietaireIdOrderByStartDateDesc(proprietaireId);
        return reservations.stream()
                .map(this::convertToReservationListDTO)
                .collect(Collectors.toList());
    }

    private ReservationListDTO convertToReservationListDTO(Reservation reservation) {
        ReservationListDTO dto = new ReservationListDTO();
        dto.setId(reservation.getId());
        dto.setStartDate(reservation.getStartDate());
        dto.setEndDate(reservation.getEndDate());
        dto.setStatus(reservation.getStatus().toString());
        dto.setCreatedAt(reservation.getCreatedAt());
        dto.setMessageEtudiant(reservation.getMessageEtudiant());
        dto.setMessageProprietaire(reservation.getMessageProprietaire());

        if (reservation.getLogement() != null) {
            LogementSummaryDTO logementDto = new LogementSummaryDTO();
            Logement logement = reservation.getLogement();
            logementDto.setId(logement.getId());
            logementDto.setAdresseLigne1(logement.getAdresseLigne1());
            logementDto.setType(logement.getType() != null ? logement.getType().toString() : "N/A");
            logementDto.setPrix(logement.getPrix());
            if (logement.getImages() != null && !logement.getImages().isEmpty()) {
                logementDto.setPhotoPrincipaleUrl(logement.getImages().get(0).getUrl());
            }
            dto.setLogement(logementDto);
        }

        if (reservation.getProprietaire() != null) {
            UtilisateurSummaryDTO proprietaireDto = new UtilisateurSummaryDTO();
            proprietaireDto.setId(reservation.getProprietaire().getId());
            proprietaireDto.setNom(reservation.getProprietaire().getNom());
            dto.setProprietaire(proprietaireDto);
        }

        if (reservation.getEtudiant() != null) {
            UtilisateurSummaryDTO etudiantDto = new UtilisateurSummaryDTO();
            etudiantDto.setId(reservation.getEtudiant().getId());
            etudiantDto.setNom(reservation.getEtudiant().getNom());
            etudiantDto.setAvatarUrl(reservation.getEtudiant().getAvatar());
            etudiantDto.setEmail(reservation.getEtudiant().getEmail());
            dto.setEtudiant(etudiantDto);
        }
        return dto;
    }

    @Transactional
    public Reservation commencerLocation(Long reservationId, Proprietaire proprietaireConnecte) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Réservation non trouvée: " + reservationId));

        if (!reservation.getLogement().getProprietaire().getId().equals(proprietaireConnecte.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Action non autorisée.");
        }
        if (reservation.getStatus() != Reservation.ReservationStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La réservation doit être confirmée. Statut: " + reservation.getStatus());
        }
        if (LocalDate.now().isBefore(reservation.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La date de début de location n'est pas encore arrivée.");
        }

        reservation.setStatus(Reservation.ReservationStatus.ONGOING);
        Logement logement = reservation.getLogement();
        logement.confirmerLocation();
        logementRepository.save(logement);

        Reservation updatedReservation = reservationRepository.save(reservation);

        String messageNotifEtudiant = String.format("Votre location pour '%s' a commencé. Bienvenue !",
                logement.getAdresseLigne1() != null ? logement.getAdresseLigne1() : "Logement ID " + logement.getId());
        notificationCreationService.createNotificationForUser(reservation.getEtudiant(), Notification.NotificationType.LOCATION_STARTED, messageNotifEtudiant, logement, proprietaireConnecte);

        return updatedReservation;
    }

    @Transactional
    public Reservation terminerLocation(Long reservationId, Proprietaire proprietaireConnecte) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Réservation non trouvée: " + reservationId));

        if (!reservation.getLogement().getProprietaire().getId().equals(proprietaireConnecte.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Action non autorisée.");
        }
        if (reservation.getStatus() != Reservation.ReservationStatus.ONGOING && reservation.getStatus() != Reservation.ReservationStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La location doit être en cours ou confirmée. Statut: " + reservation.getStatus());
        }

        reservation.setStatus(Reservation.ReservationStatus.COMPLETED);
        Reservation updatedReservation = reservationRepository.save(reservation);

        Logement logement = reservation.getLogement();
        boolean hasOtherActiveReservations = reservationRepository
                .findByLogementIdOrderByStartDateDesc(logement.getId())
                .stream()
                .anyMatch(r -> !r.getId().equals(reservationId) &&
                        (r.getStatus() == Reservation.ReservationStatus.CONFIRMED || r.getStatus() == Reservation.ReservationStatus.ONGOING));

        if (!hasOtherActiveReservations && (logement.getStatut() == StatutAnnonce.LOUEE || logement.getStatut() == StatutAnnonce.RESERVEE)) {
            logement.remettreEnLigne();
            logementRepository.save(logement);
            notificationCreationService.notifyLogementUpdate(logement, Notification.NotificationType.LOGEMENT_STATUS_CHANGED_ACTIVE,
                    String.format("Le logement '%s' est de nouveau disponible.", logement.getAdresseLigne1() != null ? logement.getAdresseLigne1() : "ID " + logement.getId()));
        }

        String messageNotifEtudiant = String.format("Votre location pour '%s' est terminée. Laissez un avis !",
                logement.getAdresseLigne1() != null ? logement.getAdresseLigne1() : "ID " + logement.getId());
        notificationCreationService.createNotificationForUser(reservation.getEtudiant(), Notification.NotificationType.LOCATION_ENDED, messageNotifEtudiant, logement, proprietaireConnecte);

        return updatedReservation;
    }

    @Transactional(readOnly = true)
    public List<DateRangeDTO> getReservedAndConfirmedDatesForLogement(Long logementId) {
        if (!logementRepository.existsById(logementId)) {
            throw new EntityNotFoundException("Logement non trouvé avec ID: " + logementId);
        }
        List<Reservation> reservations = reservationRepository.findConfirmedAndOngoingReservationsForLogement(logementId);
        return reservations.stream()
                .map(r -> new DateRangeDTO(r.getStartDate(), r.getEndDate()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DateRangeDTO> getPendingReservationDatesForStudentAndLogement(Long logementId, Long etudiantId) {
        if (!logementRepository.existsById(logementId)) {
            throw new EntityNotFoundException("Logement non trouvé avec ID: " + logementId);
        }
        List<Reservation> reservations = reservationRepository.findPendingReservationsByLogementAndEtudiant(logementId, etudiantId);
        return reservations.stream()
                .map(r -> new DateRangeDTO(r.getStartDate(), r.getEndDate()))
                .collect(Collectors.toList());
    }
}