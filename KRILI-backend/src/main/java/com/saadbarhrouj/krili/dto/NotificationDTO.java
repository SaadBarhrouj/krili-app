// =================================
// FICHIER NOUVEAU : src/main/java/com/saadbarhrouj/krili/dto/NotificationDTO.java
// But: Transporter les données de notification vers le frontend via l'API.
// =================================
package com.saadbarhrouj.krili.dto;

import com.saadbarhrouj.krili.model.Notification; // Pour l'enum Type
import lombok.Data; // Lombok pour boilerplate (getters, setters...)
import java.time.LocalDateTime;

@Data
public class NotificationDTO {
    private Long id;
    private Notification.NotificationType type;
    private String message;
    private boolean read;
    private LocalDateTime createdAt;
    private Long relatedLogementId;
    private String relatedLogementAdresse;
    private Long relatedProprietaireId;
    private String relatedProprietaireNom;
}