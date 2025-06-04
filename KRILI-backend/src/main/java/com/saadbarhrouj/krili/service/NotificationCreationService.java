package com.saadbarhrouj.krili.service;

import com.saadbarhrouj.krili.model.*;
import com.saadbarhrouj.krili.repository.NotificationRepository;
import com.saadbarhrouj.krili.repository.SubscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class NotificationCreationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationCreationService.class);

    private final NotificationRepository notificationRepository;
    private final SubscriptionRepository subscriptionRepository;

    @Autowired
    public NotificationCreationService(NotificationRepository notificationRepository,
                                       SubscriptionRepository subscriptionRepository) {
        this.notificationRepository = notificationRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyNewLogementFromProprietaire(Proprietaire proprietaire, Logement newLogement) {
        if (proprietaire == null || newLogement == null || newLogement.getId() == null || proprietaire.getId() == null) {
            log.warn("Notification annulée : Propriétaire ou logement invalide (ID Logement: {}, ID Propriétaire: {}).",
                    newLogement != null ? newLogement.getId() : "null",
                    proprietaire != null ? proprietaire.getId() : "null");
            return;
        }

        log.info("Création de notifications pour le nouveau logement ID {} du propriétaire ID {}",
                newLogement.getId(), proprietaire.getId());

        List<Subscription> subscriptions = subscriptionRepository.findByProprietaireId(proprietaire.getId());
        if (subscriptions.isEmpty()) {
            log.info("Aucun abonné trouvé pour le propriétaire ID {}", proprietaire.getId());
            return;
        }

        String adresseAffichee = truncate(newLogement.getAdresseLigne1(), 50);
        String message = String.format("%s a ajouté un nouveau logement : '%s'.",
                proprietaire.getNomAgence() != null && !proprietaire.getNomAgence().isBlank() ? proprietaire.getNomAgence() : proprietaire.getNom(),
                adresseAffichee);

        List<Notification> notifications = subscriptions.stream()
                .filter(sub -> sub.getEtudiant() != null)
                .map(sub -> Notification.builder()
                        .user(sub.getEtudiant())
                        .type(Notification.NotificationType.NEW_LOGEMENT_FROM_PROPRIETAIRE)
                        .message(message)
                        .isRead(false)
                        .relatedLogement(newLogement)
                        .relatedProprietaire(proprietaire)
                        .build())
                .collect(Collectors.toList());

        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
            log.info("{} notification(s) créée(s) pour le nouveau logement ID {}", notifications.size(), newLogement.getId());
        } else {
            log.info("Aucune notification à créer (aucun étudiant valide trouvé).");
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyLogementUpdate(Logement updatedLogement, Notification.NotificationType updateType, String customMessage) {
        if (updatedLogement == null || updatedLogement.getId() == null || updatedLogement.getProprietaire() == null) {
            log.warn("Notification annulée : logement ou propriétaire invalide (ID Logement: {}).",
                    updatedLogement != null ? updatedLogement.getId() : "null");
            return;
        }

        log.info("Création de notifications pour la mise à jour du logement ID {} (Type: {})",
                updatedLogement.getId(), updateType);

        List<Subscription> subscriptions = subscriptionRepository.findByLogementId(updatedLogement.getId());
        if (subscriptions.isEmpty()) {
            log.info("Aucun abonné trouvé pour le logement ID {}", updatedLogement.getId());
            return;
        }

        String message = (customMessage != null && !customMessage.isBlank())
                ? customMessage
                : generateDefaultUpdateMessage(updatedLogement, updateType);

        List<Notification> notifications = subscriptions.stream()
                .filter(sub -> sub.getEtudiant() != null)
                .map(sub -> Notification.builder()
                        .user(sub.getEtudiant())
                        .type(updateType)
                        .message(message)
                        .isRead(false)
                        .relatedLogement(updatedLogement)
                        .relatedProprietaire(updatedLogement.getProprietaire())
                        .build())
                .collect(Collectors.toList());

        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
            log.info("{} notification(s) créée(s) pour la mise à jour du logement ID {}", notifications.size(), updatedLogement.getId());
        } else {
            log.info("Aucune notification de mise à jour à créer.");
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createNotificationForUser(
            Utilisateur userDestinataire,
            Notification.NotificationType type,
            String message,
            Logement relatedLogement,
            Proprietaire relatedProprietaire
    ) {
        Objects.requireNonNull(userDestinataire, "L'utilisateur destinataire ne peut pas être null.");
        Objects.requireNonNull(type, "Le type de notification ne peut pas être null.");
        Objects.requireNonNull(message, "Le message de notification ne peut pas être null.");

        if (message.length() > 500) {
            log.warn("Message tronqué (plus de 500 caractères) pour l'utilisateur ID {}", userDestinataire.getId());
            message = message.substring(0, 497) + "...";
        }

        Proprietaire finalRelatedProprietaire = relatedProprietaire;
        if (userDestinataire instanceof Proprietaire && userDestinataire.getId().equals(relatedProprietaire != null ? relatedProprietaire.getId() : null)) {
            finalRelatedProprietaire = null;
        }

        Notification notification = Notification.builder()
                .user(userDestinataire)
                .type(type)
                .message(message)
                .isRead(false)
                .relatedLogement(relatedLogement)
                .relatedProprietaire(finalRelatedProprietaire)
                .build();

        try {
            Notification savedNotif = notificationRepository.save(notification);
            log.info("Notification ID {} (type: {}) créée pour l'utilisateur ID {}", savedNotif.getId(), type, userDestinataire.getId());
        } catch (Exception e) {
            log.error("Erreur lors de la sauvegarde de la notification pour l'utilisateur ID {}: {}", userDestinataire.getId(), e.getMessage(), e);
        }
    }

    private String generateDefaultUpdateMessage(Logement logement, Notification.NotificationType type) {
        String adresseCourte = truncate(logement.getAdresseLigne1(), 50);
        String messagePrefix = String.format("Le logement '%s' ", adresseCourte);

        switch (type) {
            case LOGEMENT_STATUS_CHANGED_ACTIVE: return messagePrefix + "est de nouveau disponible.";
            case LOGEMENT_STATUS_CHANGED_RESERVEE: return messagePrefix + "a été réservé.";
            case LOGEMENT_STATUS_CHANGED_LOUEE: return messagePrefix + "a été loué.";
            case LOGEMENT_STATUS_CHANGED_ARCHIVEE: return messagePrefix + "a été archivé.";
            case LOGEMENT_UPDATED: default: return messagePrefix + "a été mis à jour.";
        }
    }

    private String truncate(String value, int length) {
        if (value == null) return "[adresse non spécifiée]";
        return value.length() <= length ? value : value.substring(0, length) + "...";
    }
}
