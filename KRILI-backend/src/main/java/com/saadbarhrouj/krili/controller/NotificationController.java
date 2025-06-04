// =================================
// FICHIER NOUVEAU : src/main/java/com/saadbarhrouj/krili/controller/NotificationController.java
// But: Exposer l'API pour que les étudiants récupèrent/gèrent leurs notifications.
// =================================
package com.saadbarhrouj.krili.controller;

import com.saadbarhrouj.krili.dto.NotificationDTO;
import com.saadbarhrouj.krili.model.Etudiant;
import com.saadbarhrouj.krili.repository.EtudiantRepository; // ou UtilisateurRepository
import com.saadbarhrouj.krili.service.NotificationQueryService;
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
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("hasRole('ETUDIANT')") // Seul un étudiant peut accéder à ses notifications
public class NotificationController {

    private static final Logger log = LoggerFactory.getLogger(NotificationController.class);

    @Autowired private NotificationQueryService notificationQueryService;
    @Autowired private EtudiantRepository etudiantRepository;

    // Récupérer mes notifications (paginé)
    @GetMapping
    public ResponseEntity<Page<NotificationDTO>> getMyNotifications(
            @AuthenticationPrincipal UserDetails currentUser,
            @PageableDefault(size = 10, sort = "createdAt,desc") Pageable pageable) {
        try {
            Etudiant etudiant = findEtudiantFromUserDetails(currentUser);
            Page<NotificationDTO> notifications = notificationQueryService.getNotificationsForUser(etudiant.getId(), pageable);
            return ResponseEntity.ok(notifications);
        } catch (ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).build(); }
        catch (Exception e) { log.error("Erreur getMyNotifications User {}", currentUser.getUsername(), e); return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();}
    }

    // Obtenir le nombre de notifications non lues
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @AuthenticationPrincipal UserDetails currentUser) {
        try {
            Etudiant etudiant = findEtudiantFromUserDetails(currentUser);
            long count = notificationQueryService.getUnreadNotificationCount(etudiant.getId());
            return ResponseEntity.ok(Map.of("unreadCount", count));
        } catch (ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).build(); }
        catch (Exception e) { log.error("Erreur getUnreadCount User {}", currentUser.getUsername(), e); return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();}
    }

    // Marquer une notification comme lue
    @PostMapping("/{id}/mark-as-read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails currentUser) {
        try {
            Etudiant etudiant = findEtudiantFromUserDetails(currentUser);
            boolean success = notificationQueryService.markAsRead(id, etudiant.getId());
            return success ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
        } catch (ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).build(); }
        catch (Exception e) { log.error("Erreur markAsRead Notif ID {} User {}", id, currentUser.getUsername(), e); return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();}
    }

    // Marquer toutes les notifications comme lues
    @PostMapping("/mark-all-as-read")
    public ResponseEntity<Map<String, Integer>> markAllAsRead(
            @AuthenticationPrincipal UserDetails currentUser) {
        try {
            Etudiant etudiant = findEtudiantFromUserDetails(currentUser);
            int updatedCount = notificationQueryService.markAllAsRead(etudiant.getId());
            return ResponseEntity.ok(Map.of("updatedCount", updatedCount));
        } catch (ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).build(); }
        catch (Exception e) { log.error("Erreur markAllAsRead User {}", currentUser.getUsername(), e); return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();}
    }

    // --- Méthode Helper ---
    private Etudiant findEtudiantFromUserDetails(UserDetails userDetails) {
        if (userDetails == null) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise."); }
        String email = userDetails.getUsername();
        return etudiantRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("Utilisateur authentifié '{}' non trouvé comme Etudiant en base.", email);
                    return new ResponseStatusException(HttpStatus.FORBIDDEN, "Utilisateur étudiant non valide.");
                });
    }
}