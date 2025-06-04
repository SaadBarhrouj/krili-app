
package com.saadbarhrouj.krili.controller;

import com.saadbarhrouj.krili.dto.ProprietaireDetailsDTO;
import com.saadbarhrouj.krili.dto.ProfilProprietaireDTO;

// --- Mod??les ---
import com.saadbarhrouj.krili.model.Etudiant;
import com.saadbarhrouj.krili.model.Proprietaire;
import com.saadbarhrouj.krili.model.Utilisateur; // N??cessaire pour le cast

// --- Repositories ---
import com.saadbarhrouj.krili.repository.EtudiantRepository;
import com.saadbarhrouj.krili.repository.ProprietaireRepository;

// --- Services ---
import com.saadbarhrouj.krili.service.ImageStorageService;
import com.saadbarhrouj.krili.service.ProfileService;
import com.saadbarhrouj.krili.service.ProprietaireService;
import com.saadbarhrouj.krili.service.SubscriptionService;
import com.saadbarhrouj.krili.service.JwtService; // <-- NOUVEL IMPORT

// --- Spring & Autres ---
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.HashMap; // N??cessaire pour la r??ponse
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api")
public class ProprietaireController {

    private static final Logger log = LoggerFactory.getLogger(ProprietaireController.class);

    // --- Injections ---
    @Autowired private ProprietaireService proprietaireServicePublic;
    @Autowired private SubscriptionService subscriptionService;
    @Autowired private EtudiantRepository etudiantRepository;
    @Autowired private ProprietaireRepository proprietaireRepository;
    @Autowired private ProfileService profileService;
    @Autowired private ImageStorageService imageStorageService;
    @Autowired private JwtService jwtService;

    @GetMapping("/proprietaires/{id}")
    public ResponseEntity<ProprietaireDetailsDTO> getProprietaireProfile(@PathVariable Long id) { /* ... code ... */
        log.debug("Requ??te GET /api/proprietaires/{}", id);
        try {
            ProprietaireDetailsDTO details = proprietaireServicePublic.getProprietaireDetailsById(id);
            return ResponseEntity.ok(details);
        } catch (NoSuchElementException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Propri??taire non trouv??", e);
        } catch (Exception e) {
            log.error("Erreur interne r??cup??ration profil public ID {}: {}", id, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur serveur interne", e);
        }
    }
    @GetMapping("/proprietaires/{id}/subscription-status")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<?> checkSubscriptionStatus(@PathVariable Long id, @AuthenticationPrincipal UserDetails currentUser) { /* ... code ... */
        log.debug("Requ??te GET /api/proprietaires/{}/subscription-status par {}", id, currentUser.getUsername());
        try {
            Etudiant etudiant = findEtudiantFromUserDetails(currentUser);
            boolean isSubscribed = subscriptionService.isSubscribedToProprietaire(etudiant.getId(), id);
            return ResponseEntity.ok(Map.of("isSubscribed", isSubscribed));
        } catch (ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason())); }
        catch (Exception e) { log.error("Erreur checkSubscriptionStatus Proprio {} User {}", id, currentUser.getUsername(), e); return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur serveur.")); }
    }
    @PostMapping("/proprietaires/{id}/subscribe")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<?> subscribe(@PathVariable Long id, @AuthenticationPrincipal UserDetails currentUser) { /* ... code ... */
        log.info("Requ??te POST /api/proprietaires/{}/subscribe par {}", id, currentUser.getUsername());
        try {
            Etudiant etudiant = findEtudiantFromUserDetails(currentUser);
            subscriptionService.subscribeToProprietaire(etudiant.getId(), id);
            return ResponseEntity.ok(Map.of("message", "Abonnement r??ussi."));
        } catch (ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason())); }
        catch (NoSuchElementException e) { return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Propri??taire non trouv??.")); }
        catch (IllegalStateException e) { return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage())); }
        catch (Exception e) { log.error("Erreur subscribe Proprio {} User {}", id, currentUser.getUsername(), e); return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur interne lors de l'abonnement.")); }
    }
    @DeleteMapping("/proprietaires/{id}/subscribe")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<Void> unsubscribe(@PathVariable Long id, @AuthenticationPrincipal UserDetails currentUser) { /* ... code ... */
        log.info("Requ??te DELETE /api/proprietaires/{}/subscribe par {}", id, currentUser.getUsername());
        try {
            Etudiant etudiant = findEtudiantFromUserDetails(currentUser);
            subscriptionService.unsubscribeFromProprietaire(etudiant.getId(), id);
            return ResponseEntity.noContent().build();
        } catch (ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).build(); }
        catch (Exception e) { log.error("Erreur unsubscribe Proprio {} User {}", id, currentUser.getUsername(), e); return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();}
    }

    // ======================================================
    // == ENDPOINTS PROFIL PROPRI??TAIRE CONNECT?? (MIS ?? JOUR) ==
    // ======================================================

    @GetMapping("/profil/proprietaire")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<ProfilProprietaireDTO> getCurrentProprietaireProfile(
            @AuthenticationPrincipal UserDetails currentUser) {
        log.info("Requ??te GET /api/profil/proprietaire pour l'utilisateur {}", currentUser.getUsername());
        try {
            ProfilProprietaireDTO profileData = profileService.getProprietaireProfileByEmail(currentUser.getUsername());
            return ResponseEntity.ok(profileData);
        } catch (NoSuchElementException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profil propri??taire non trouv??.", e);
        } catch (Exception e) {
            log.error("Erreur r??cup??ration profil propri??taire pour {}: {}", currentUser.getUsername(), e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur serveur lors de la r??cup??ration du profil.", e);
        }
    }

    @PatchMapping(value = "/profil/proprietaire", consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<Map<String, String>> updateCurrentProprietaireProfile(
            @AuthenticationPrincipal UserDetails currentUserDetails, // Renomm?? pour clart??
            @RequestParam(value = "nom", required = false) String nom,
            @RequestParam(value = "telephone", required = false) String telephone,
            @RequestParam(value = "photoProfil", required = false) MultipartFile photoProfil) {
        log.info("Requ??te PATCH /api/profil/proprietaire pour {}", currentUserDetails.getUsername());
        try {
            Proprietaire proprietaireConnecte = findProprietaireFromUserDetails(currentUserDetails);

            ProfilProprietaireDTO updateData = new ProfilProprietaireDTO();
            boolean hasTextUpdates = false;
            if (nom != null) { updateData.setNom(nom); hasTextUpdates = true; }
            if (telephone != null) { updateData.setTelephone(telephone); hasTextUpdates = true; }

            String newAvatarId = null;
            boolean avatarUpdated = false;
            if (photoProfil != null && !photoProfil.isEmpty()) {
                log.debug("Traitement du nouveau fichier avatar...");
                try {
                    // La suppression de l'ancien avatar est mieux g??r??e dans le service si besoin
                    List<String> identifiers = imageStorageService.storeImages(List.of(photoProfil), proprietaireConnecte.getId());
                    if (!identifiers.isEmpty()) {
                        newAvatarId = identifiers.get(0);
                        avatarUpdated = true;
                        log.info("Nouvel avatar upload?? avec ID : {}", newAvatarId);
                    }
                } catch (IOException e) {
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur lors de la sauvegarde de la nouvelle photo.", e);
                }
            }

            if (!hasTextUpdates && !avatarUpdated) {
                log.info("Aucune modification d??tect??e pour le profil de {}", currentUserDetails.getUsername());
                return ResponseEntity.ok(Map.of("message", "Aucune modification d??tect??e."));
            }

            // Appeler le service pour appliquer les mises ?? jour ?? l'entit??
            profileService.updateProprietaireProfile(proprietaireConnecte.getId(), updateData, newAvatarId);

            // ---> R??cup??rer l'entit?? mise ?? jour pour g??n??rer le nouveau token <---
            // C'est important car l'entit?? `proprietaireConnecte` n'a pas ??t?? modifi??e directement ici
            Proprietaire proprietaireMisAJour = proprietaireRepository.findById(proprietaireConnecte.getId())
                    .orElseThrow(() -> new NoSuchElementException("Propri??taire introuvable apr??s mise ?? jour pour la g??n??ration du token"));


            // G??n??rer un nouveau token JWT avec les informations ?? jour
            // Assurez-vous que votre classe Proprietaire impl??mente UserDetails ou adaptez ceci
            UserDetails updatedUserDetails = proprietaireMisAJour;
            String newToken = jwtService.generateToken(updatedUserDetails);
            log.info("Nouveau token g??n??r?? apr??s mise ?? jour du profil pour {}", proprietaireMisAJour.getEmail());
            // ---> Fin G??n??ration Token <---


            // Pr??parer la r??ponse ?? envoyer au frontend
            Map<String, String> responseBody = new HashMap<>(); // Utiliser HashMap pour ??tre mutable
            responseBody.put("message", "Profil mis ?? jour avec succ??s.");
            responseBody.put("token", newToken); // <-- INCLURE LE NOUVEAU TOKEN
            if (newAvatarId != null) {
                responseBody.put("newAvatarId", newAvatarId); // Inclure l'ID si l'avatar a chang??
            }
            return ResponseEntity.ok(responseBody);

        } catch (ResponseStatusException e) {
            log.warn("Erreur (ResponseStatusException) lors de la mise ?? jour du profil pour {}: {} ({})", currentUserDetails.getUsername(), e.getReason(), e.getStatusCode());
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason() != null ? e.getReason() : "Erreur lors de la mise ?? jour."));
        } catch (NoSuchElementException e) { // Capturer sp??cifiquement si findById ??choue apr??s update
            log.error("Erreur critique: Propri??taire disparu apr??s mise ?? jour pour {}: {}", currentUserDetails.getUsername(), e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur interne lors de la r??cup??ration des donn??es mises ?? jour."));
        }
        catch (Exception e) {
            log.error("Erreur interne inattendue lors de la mise ?? jour du profil pour {}: {}", currentUserDetails.getUsername(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur interne du serveur."));
        }
    }

    // --- M??thodes Helper Priv??es ---
    private Etudiant findEtudiantFromUserDetails(UserDetails userDetails) { /* ... code inchang?? ... */
        if (userDetails == null) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise."); }
        String email = userDetails.getUsername();
        if (email == null || email.isBlank()) { throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d'identifier l'utilisateur.");}
        return etudiantRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Action non autoris??e pour cet utilisateur."));
    }
    private Proprietaire findProprietaireFromUserDetails(UserDetails userDetails) { /* ... code inchang?? ... */
        if (userDetails == null) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise."); }
        String email = userDetails.getUsername();
        if (email == null || email.isBlank()) { throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d'identifier l'utilisateur connect??."); }
        return proprietaireRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Utilisateur propri??taire invalide ou introuvable."));
    }
}