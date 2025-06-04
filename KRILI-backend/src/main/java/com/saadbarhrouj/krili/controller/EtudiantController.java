// KRILI-backend\src\main\java\com\saadbarhrouj\krili\controller\EtudiantController.java
// (Ou dans un ProfileController si vous en avez un)
package com.saadbarhrouj.krili.controller;

import com.saadbarhrouj.krili.dto.EtudiantPublicProfilDTO;
import com.saadbarhrouj.krili.model.Etudiant;
import com.saadbarhrouj.krili.model.Utilisateur;
import com.saadbarhrouj.krili.repository.UtilisateurRepository; // Pour recharger UserDetails
import com.saadbarhrouj.krili.service.EtudiantService;
import com.saadbarhrouj.krili.service.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException; // Pour les erreurs HTTP

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api") // Ou /api/etudiants si vous préférez
public class EtudiantController {

    private static final Logger log = LoggerFactory.getLogger(EtudiantController.class);

    private final EtudiantService etudiantService;
    private final JwtService jwtService;
    private final UtilisateurRepository utilisateurRepository; // Nécessaire pour recharger UserDetails pour le token

    @Autowired
    public EtudiantController(EtudiantService etudiantService,
                              JwtService jwtService,
                              UtilisateurRepository utilisateurRepository) {
        this.etudiantService = etudiantService;
        this.jwtService = jwtService;
        this.utilisateurRepository = utilisateurRepository;
    }

    @GetMapping("/etudiants/{etudiantId}/profil-public")
    @PreAuthorize("isAuthenticated()") // Peut-être juste @permitAll ou un rôle spécifique
    public ResponseEntity<EtudiantPublicProfilDTO> getProfilPublicEtudiant(@PathVariable Long etudiantId) {
        // ... (code existant)
        try {
            EtudiantPublicProfilDTO profil = etudiantService.getEtudiantPublicProfilById(etudiantId);
            return ResponseEntity.ok(profil);
        } catch (jakarta.persistence.EntityNotFoundException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage(), e);
        }
    }

    // NOUVEL ENDPOINT pour la mise à jour du profil de l'étudiant connecté
    @PatchMapping("/profil/etudiant") // Utiliser PATCH car c'est une mise à jour partielle
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<Map<String, Object>> updateMonProfilEtudiant(
            @AuthenticationPrincipal Utilisateur utilisateurConnecte, // L'étudiant actuellement authentifié
            // Utiliser @RequestParam car les données viennent de FormData
            @RequestParam(value = "nom", required = false) String nom,
            @RequestParam(value = "telephone", required = false) String telephone,
            @RequestParam(value = "villeEtude", required = false) String villeEtude,
            @RequestParam(value = "etablissement", required = false) String etablissement,
            @RequestParam(value = "filiere", required = false) String filiere,
            @RequestParam(value = "anneeEtude", required = false) Integer anneeEtude,
            @RequestParam(value = "photoProfil", required = false) MultipartFile photoProfilFile
    ) {
        log.info("CONTROLLER: Requête PATCH /profil/etudiant pour utilisateur ID {}", utilisateurConnecte.getId());

        if (!(utilisateurConnecte instanceof Etudiant)) {
            log.warn("CONTROLLER: Tentative de mise à jour du profil étudiant par un non-étudiant (ID: {})", utilisateurConnecte.getId());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Action non autorisée pour ce type d'utilisateur."));
        }

        try {
            // Appeler le service pour mettre à jour le profil
            Etudiant etudiantMisAJour = etudiantService.updateEtudiantProfile(
                    utilisateurConnecte.getId(),
                    nom, telephone,
                    villeEtude, etablissement, filiere, anneeEtude,
                    photoProfilFile
            );

            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("message", "Profil étudiant mis à jour avec succès.");

            // Vérifier si des informations impactant le token ont été modifiées
            boolean tokenNeedsRefresh = false;
            if ((nom != null && !nom.equals(utilisateurConnecte.getNom())) ||
                    (photoProfilFile != null && !photoProfilFile.isEmpty()) || // Si une photo a été uploadée
                    (villeEtude != null && !villeEtude.equals(((Etudiant) utilisateurConnecte).getVilleEtude())) ||
                    (etablissement != null && !etablissement.equals(((Etudiant) utilisateurConnecte).getEtablissement())) ||
                    (filiere != null && !filiere.equals(((Etudiant) utilisateurConnecte).getFiliere())) ||
                    (anneeEtude != null && !anneeEtude.equals(((Etudiant) utilisateurConnecte).getAnneeEtude()))
            ) {
                tokenNeedsRefresh = true;
            }
            // Si le service a retourné un nouvel ID d'avatar (car il a été changé)
            if (!Objects.equals(utilisateurConnecte.getAvatar(), etudiantMisAJour.getAvatar())) {
                responseBody.put("newAvatarId", etudiantMisAJour.getAvatar());
                tokenNeedsRefresh = true; // L'avatar est dans le token
            }


            if (tokenNeedsRefresh) {
                // Recharger UserDetails APRÈS la sauvegarde pour garantir que toutes les données sont fraîches
                UserDetails freshUserDetails = utilisateurRepository.findByEmail(etudiantMisAJour.getEmail())
                        .orElseThrow(() -> new RuntimeException("Erreur critique: Utilisateur mis à jour non trouvable pour la regénération du token."));
                String newToken = jwtService.generateToken(freshUserDetails);
                responseBody.put("token", newToken);
                log.info("CONTROLLER: Nouveau token JWT généré pour l'étudiant ID {}", etudiantMisAJour.getId());
            }

            return ResponseEntity.ok(responseBody);

        } catch (jakarta.persistence.EntityNotFoundException e) {
            log.warn("CONTROLLER: Étudiant non trouvé lors de la tentative de MAJ profil: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage(), e);
        } catch (IOException e) {
            log.error("CONTROLLER: Erreur IO lors de la MAJ du profil étudiant ID {}: {}", utilisateurConnecte.getId(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur serveur lors de la sauvegarde de l'image."));
        } catch (IllegalArgumentException e) {
            log.warn("CONTROLLER: Données invalides pour MAJ profil étudiant ID {}: {}", utilisateurConnecte.getId(), e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("CONTROLLER: Erreur inattendue lors de la MAJ profil étudiant ID {}: {}", utilisateurConnecte.getId(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur interne du serveur."));
        }
    }
}