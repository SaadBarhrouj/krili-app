package com.saadbarhrouj.krili.controller;

import com.saadbarhrouj.krili.dto.AnnonceCreationDTO;
import com.saadbarhrouj.krili.dto.LogementDTO;
import com.saadbarhrouj.krili.model.*;
import com.saadbarhrouj.krili.service.*;
import com.saadbarhrouj.krili.service.facade.AnnoncePublicationFacade;
import com.saadbarhrouj.krili.repository.EtudiantRepository;
import com.saadbarhrouj.krili.repository.ProprietaireRepository;
import com.saadbarhrouj.krili.strategy.LogementRechercheCriteria;
import jakarta.persistence.EntityNotFoundException; // Importé pour l'utiliser
import jakarta.validation.Valid;
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

import java.util.*;
import java.util.function.BiFunction;

@RestController
@RequestMapping("/api/logements")
public class LogementController {

    private static final Logger log = LoggerFactory.getLogger(LogementController.class);

    private final LogementService logementService;
    private final AnnoncePublicationFacade annonceFacade;
    private final ProprietaireRepository proprietaireRepository;
    private final SubscriptionService subscriptionService;
    private final EtudiantRepository etudiantRepository;

    @Autowired
    public LogementController(LogementService logementService,
                              AnnoncePublicationFacade annonceFacade,
                              ProprietaireRepository proprietaireRepository,
                              SubscriptionService subscriptionService,
                              EtudiantRepository etudiantRepository) {
        this.logementService = logementService;
        this.annonceFacade = annonceFacade;
        this.proprietaireRepository = proprietaireRepository;
        this.subscriptionService = subscriptionService;
        this.etudiantRepository = etudiantRepository;
    }

    // ... (Endpoints de changement d'état : publierAnnonce, archiverAnnonce, etc. - INCHANGÉS) ...
    @PostMapping("/{id}/publier")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<?> publierAnnonce(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        return handleStateChange(id, userDetails, "publication", logementService::publierLogement);
    }

    @PostMapping("/{id}/archiver")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<?> archiverAnnonce(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        return handleStateChange(id, userDetails, "archivage", logementService::archiverLogement);
    }

    @PostMapping("/{id}/reserver")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<?> reserverAnnonce(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        Proprietaire proprietaire = findProprietaireFromUserDetails(userDetails);
        return handleStateChange(id, userDetails, "reservation", (logementId, proprioId) -> logementService.reserverLogement(logementId, proprioId));
    }

    @PostMapping("/{id}/confirmerLocation")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<?> confirmerLocationAnnonce(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        return handleStateChange(id, userDetails, "confirmation de location", logementService::confirmerLocationLogement);
    }

    @PostMapping("/{id}/remettreEnLigne")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<?> remettreEnLigneAnnonce(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        return handleStateChange(id, userDetails, "remise en ligne", logementService::remettreEnLigneLogement);
    }

    @PostMapping("/{id}/passerEnBrouillon")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<?> passerEnBrouillonAnnonce(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        return handleStateChange(id, userDetails, "passage en brouillon", logementService::passerEnBrouillonLogement);
    }

    private ResponseEntity<?> handleStateChange(Long id, UserDetails userDetails, String actionDescription,
                                                BiFunction<Long, Long, Logement> serviceAction) {
        Objects.requireNonNull(id, "L'ID du logement est requis.");
        Objects.requireNonNull(userDetails, "L'utilisateur connecté est requis.");
        try {
            Proprietaire proprietaire = findProprietaireFromUserDetails(userDetails);
            Logement logementMisAJour = serviceAction.apply(id, proprietaire.getId());
            return ResponseEntity.ok(logementService.convertToDtoWithDetails(logementMisAJour));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
        } catch (NoSuchElementException | EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Ressource non trouvée ou action non autorisée: " + e.getMessage()));
        } catch (Exception e) {
            log.error("CONTROLLER: Erreur interne action '{}' Logement ID {}: {}", actionDescription, id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur serveur interne: " + actionDescription));
        }
    }


    // --- CRÉATION D'ANNONCE ---
    @PostMapping(value = "/creer", consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<?> creerAnnonce(
            @RequestPart("annonceData") @Valid AnnonceCreationDTO annonceDTO,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal UserDetails userDetails) {
        // ... (logique inchangée)
        try {
            Proprietaire proprietaire = findProprietaireFromUserDetails(userDetails);
            Logement logementCree = annonceFacade.creerOuMettreAJourAnnonce(annonceDTO, proprietaire, images);
            return new ResponseEntity<>(logementService.convertToDtoWithDetails(logementCree), HttpStatus.CREATED);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
        } catch (IllegalArgumentException | IllegalStateException | EntityNotFoundException e) {
            log.warn("CONTROLLER: Erreur validation/création annonce par {}: {}", userDetails.getUsername(), e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("CONTROLLER: Erreur Runtime création annonce par {}: {}", userDetails.getUsername(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur technique lors de la création."));
        }
    }

    // --- LECTURE D'ANNONCES ---
    @GetMapping("/{id}")
    public ResponseEntity<LogementDTO> getLogement(@PathVariable Long id) {
        // ... (logique inchangée)
        try {
            LogementDTO dto = logementService.getLogement(id);
            return ResponseEntity.ok(dto);
        } catch (EntityNotFoundException e) {
            log.warn("Logement non trouvé pour GET /{}", id);
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping
    public ResponseEntity<List<LogementDTO>> getAllLogements() {
        // ... (logique inchangée)
        return ResponseEntity.ok(logementService.getAllLogements());
    }

    // --- MODIFICATION D'ANNONCE ---
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<?> modifierLogement(
            @PathVariable Long id,
            @RequestBody @Valid LogementDTO logementDtoAvecModifications, // Le DTO avec les nouvelles valeurs
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("CTRL: PUT pour modifier logement ID {} par {}", id, userDetails.getUsername());
        try {
            Proprietaire proprietaire = findProprietaireFromUserDetails(userDetails);

            // Vérifier l'appartenance avant d'appeler le service
            logementService.findLogementEntityByIdAndProprietaire(id, proprietaire.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Action non autorisée ou logement inexistant."));

            // Passer directement le DTO au service.
            // La méthode LogementService.modifierLogement(Long, LogementDTO) gère la reconstruction.
            Logement logementMisAJour = logementService.modifierLogement(id, logementDtoAvecModifications);

            return ResponseEntity.ok(logementService.convertToDtoWithDetails(logementMisAJour));

        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("CTRL: Erreur interne modification Logement ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur interne."));
        }
    }


    // --- SUPPRESSION D'ANNONCE ---
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<Void> supprimerLogement(@PathVariable Long id,
                                                  @AuthenticationPrincipal UserDetails userDetails) {
        log.info("CONTROLLER: Requête DELETE /{} par {}", id, userDetails.getUsername());
        try {
            Proprietaire proprietaire = findProprietaireFromUserDetails(userDetails);
            // CORRECTION ICI : Vérifier l'appartenance en essayant de récupérer l'entité
            logementService.findLogementEntityByIdAndProprietaire(id, proprietaire.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Action non autorisée ou logement inexistant pour ce propriétaire."));

            logementService.supprimerLogement(id);
            return ResponseEntity.noContent().build();
        } catch (ResponseStatusException e) {
            // Si findProprietaireFromUserDetails ou findLogementEntityByIdAndProprietaire lève une ResponseStatusException
            return ResponseEntity.status(e.getStatusCode()).build();
        } catch (EntityNotFoundException e) { // Au cas où supprimerLogement lèverait ceci si l'entité disparaît entre-temps
            return ResponseEntity.notFound().build();
        }
        catch (Exception e) {
            log.error("CONTROLLER: Erreur interne suppression Logement ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // --- RECHERCHE D'ANNONCES ---
    @GetMapping("/rechercher")
    public ResponseEntity<?> rechercherLogements(
            // ... (paramètres inchangés) ...
            @RequestParam(required = false) String strategie,
            @RequestParam(required = false) Long villeId,
            @RequestParam(required = false) TypeLogement type,
            @RequestParam(required = false) Double prixMax,
            @RequestParam(required = false) String adresse,
            @RequestParam(required = false) Set<Long> etablissementIds
    ) {
        // ... (logique inchangée)
        log.debug("CONTROLLER: Requête GET /rechercher - Stratégie: {}, VilleID: {}, Type: {}, PrixMax: {}, Adresse: {}, Etabs: {}",
                strategie, villeId, type, prixMax, adresse, etablissementIds);

        LogementRechercheCriteria criteres = new LogementRechercheCriteria();
        criteres.setVilleId(villeId);
        criteres.setType(type);
        criteres.setPrixMax(prixMax);
        criteres.setAdresse(adresse);
        if (etablissementIds != null) {
            criteres.setEtablissementIds(etablissementIds);
        }

        try {
            List<LogementDTO> logementsDTO = logementService.rechercherLogements(criteres, strategie);
            return ResponseEntity.ok(logementsDTO);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("CONTROLLER: Erreur recherche logements: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur serveur lors de la recherche."));
        }
    }

    // --- MES LOGEMENTS (Propriétaire) ---
    @GetMapping("/mes-logements")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    public ResponseEntity<List<LogementDTO>> getMesLogements(@AuthenticationPrincipal UserDetails userDetails) {
        // ... (Logique inchangée)
        log.info("CONTROLLER: Requête GET /mes-logements par {}", userDetails.getUsername());
        try {
            Proprietaire proprietaire = findProprietaireFromUserDetails(userDetails);
            List<LogementDTO> mesLogements = logementService.getLogementsByProprietaireId(proprietaire.getId());
            return ResponseEntity.ok(mesLogements);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Collections.emptyList());
        }
        catch (Exception e) {
            log.error("CONTROLLER: Erreur getMesLogements User {}: {}", userDetails.getUsername(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    // --- FAVORIS (Étudiant) ---
    // ... (méthodes inchangées) ...
    @GetMapping("/{id}/favorite-status")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<?> checkFavoriteStatus(@PathVariable Long id, @AuthenticationPrincipal UserDetails currentUser) {
        log.debug("Requête GET /{}/favorite-status par {}", id, currentUser.getUsername());
        try {
            Etudiant etudiant = findEtudiantFromUserDetails(currentUser);
            boolean isFavorite = subscriptionService.isSubscribedToLogement(etudiant.getId(), id);
            return ResponseEntity.ok(Map.of("isFavorite", isFavorite));
        } catch (ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason())); }
        catch (Exception e) { log.error("Erreur checkFavoriteStatus Logement {} User {}", id, currentUser.getUsername(), e); return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur serveur"));}
    }

    @PostMapping("/{id}/favorite")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<?> addToFavorites(@PathVariable Long id, @AuthenticationPrincipal UserDetails currentUser) {
        log.info("Requête POST /{}/favorite par {}", id, currentUser.getUsername());
        try {
            Etudiant etudiant = findEtudiantFromUserDetails(currentUser);
            subscriptionService.subscribeToLogement(etudiant.getId(), id);
            return ResponseEntity.ok(Map.of("message", "Logement ajouté aux favoris."));
        } catch (ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason())); }
        catch (NoSuchElementException e) { log.warn("Tentative ajout favori logement inexistant ID {} par {}", id, currentUser.getUsername()); return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Logement non trouvé.")); }
        catch (IllegalStateException e) { log.warn("Tentative ajout favori dupliqué Logement {} User {}", id, currentUser.getUsername()); return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage())); }
        catch (Exception e) { log.error("Erreur addToFavorites Logement {} User {}", id, currentUser.getUsername(), e); return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur interne lors de l'ajout aux favoris."));}
    }

    @DeleteMapping("/{id}/favorite")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<Void> removeFromFavorites(@PathVariable Long id, @AuthenticationPrincipal UserDetails currentUser) {
        log.info("Requête DELETE /{}/favorite par {}", id, currentUser.getUsername());
        try {
            Etudiant etudiant = findEtudiantFromUserDetails(currentUser);
            subscriptionService.unsubscribeFromLogement(etudiant.getId(), id);
            return ResponseEntity.noContent().build();
        } catch (ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).build(); }
        catch (Exception e) { log.error("Erreur removeFromFavorites Logement {} User {}", id, currentUser.getUsername(), e); return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();}
    }

    // --- MÉTHODES HELPER PRIVÉES ---
    private Etudiant findEtudiantFromUserDetails(UserDetails userDetails) {
        // ... (logique inchangée)
        if (userDetails == null) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise."); }
        String email = userDetails.getUsername();
        if (email == null || email.isBlank()) { throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d'identifier l'utilisateur.");}
        return etudiantRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("Utilisateur authentifié '{}' non trouvé comme Etudiant.", email);
                    return new ResponseStatusException(HttpStatus.FORBIDDEN, "Utilisateur étudiant non valide ou non trouvé.");
                });
    }

    private Proprietaire findProprietaireFromUserDetails(UserDetails userDetails) {
        if (userDetails == null) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise."); }
        String email = userDetails.getUsername();
        if (email == null || email.isBlank()) { throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d'identifier l'utilisateur.");}
        return proprietaireRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("Utilisateur authentifié '{}' non trouvé comme Proprietaire.", email);
                    return new ResponseStatusException(HttpStatus.FORBIDDEN, "Utilisateur propriétaire non valide ou non trouvé.");
                });
    }


    @GetMapping("/mes-favoris")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<List<LogementDTO>> getMesFavoris(@AuthenticationPrincipal UserDetails currentUser) {
        try {
            Etudiant etudiant = findEtudiantFromUserDetails(currentUser); // Utilisez votre m??thode helper
            List<LogementDTO> favoris = subscriptionService.getFavoriteLogements(etudiant.getId());
            return ResponseEntity.ok(favoris);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Collections.emptyList()); // Ou un message d'erreur
        } catch (Exception e) {
            log.error("Erreur lors de la r??cup??ration des favoris pour {}: {}", currentUser.getUsername(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }
}