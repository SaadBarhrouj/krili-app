package com.saadbarhrouj.krili.service;

import com.saadbarhrouj.krili.dto.NotificationDTO;
import com.saadbarhrouj.krili.model.Logement; // Import nécessaire si vous accédez à ses champs
import com.saadbarhrouj.krili.model.Notification;
import com.saadbarhrouj.krili.model.Proprietaire; // Import nécessaire
import com.saadbarhrouj.krili.repository.NotificationRepository;
import org.slf4j.Logger; // Pour le logging
import org.slf4j.LoggerFactory; // Pour le logging
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationQueryService {

    private static final Logger log = LoggerFactory.getLogger(NotificationQueryService.class); // Logger

    private final NotificationRepository notificationRepository;

    @Autowired
    public NotificationQueryService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public Page<NotificationDTO> getNotificationsForUser(Long userId, Pageable pageable) {
        log.debug("Récupération des notifications paginées pour l'utilisateur ID: {}", userId);
        Page<Notification> page = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return page.map(this::convertToDto);
    }

    @Transactional(readOnly = true)
    public long getUnreadNotificationCount(Long userId) {
        log.debug("Comptage des notifications non lues pour l'utilisateur ID: {}", userId);
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public boolean markAsRead(Long notificationId, Long userId) {
        log.debug("Marquage de la notification ID: {} comme lue pour l'utilisateur ID: {}", notificationId, userId);
        int updatedCount = notificationRepository.markAsRead(notificationId, userId);
        if (updatedCount > 0) {
            log.info("Notification ID: {} marquée comme lue pour l'utilisateur ID: {}", notificationId, userId);
            return true;
        }
        log.warn("Tentative de marquer la notification ID: {} comme lue a échoué (non trouvée ou n'appartient pas à l'utilisateur ID: {})", notificationId, userId);
        return false;
    }

    @Transactional
    public int markAllAsRead(Long userId) {
        log.info("Marquage de toutes les notifications comme lues pour l'utilisateur ID: {}", userId);
        int updatedCount = notificationRepository.markAllAsRead(userId);
        log.info("{} notifications marquées comme lues pour l'utilisateur ID: {}", updatedCount, userId);
        return updatedCount;
    }


    private NotificationDTO convertToDto(Notification notification) {
        if (notification == null) {
            return null;
        }

        NotificationDTO dto = new NotificationDTO();
        dto.setId(notification.getId());
        dto.setType(notification.getType());
        dto.setMessage(notification.getMessage());
        dto.setRead(notification.isRead());
        dto.setCreatedAt(notification.getCreatedAt());

        Logement relatedLogement = notification.getRelatedLogement();
        if (relatedLogement != null) {
            dto.setRelatedLogementId(relatedLogement.getId());
            dto.setRelatedLogementAdresse(relatedLogement.getAdresseLigne1());
        }

        Proprietaire relatedProprietaire = notification.getRelatedProprietaire();
        if (relatedProprietaire != null) {
            dto.setRelatedProprietaireId(relatedProprietaire.getId());
            dto.setRelatedProprietaireNom(relatedProprietaire.getNom());
        }

        return dto;
    }
}