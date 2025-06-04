package com.saadbarhrouj.krili.controller;

import com.saadbarhrouj.krili.dto.LoginRequest;
import com.saadbarhrouj.krili.dto.LoginResponse;
import com.saadbarhrouj.krili.model.Etudiant;
import com.saadbarhrouj.krili.model.Proprietaire;
import com.saadbarhrouj.krili.service.ImageStorageService; // Service pour gérer les images/avatars
import com.saadbarhrouj.krili.service.InscriptionService;
import com.saadbarhrouj.krili.service.JwtService;
import org.slf4j.Logger;                     // Logger SLF4J
import org.slf4j.LoggerFactory;             // Logger SLF4J
import org.springframework.beans.factory.annotation.Autowired; // Optionnel si injection par constructeur
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService; // Gardé pour injection
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;


@RestController
@RequestMapping("/api/auth") // Préfixe pour toutes les routes de ce contrôleur
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    // --- Dépendances Injectées ---
    private final InscriptionService inscriptionService;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService; // Injecté pour AuthenticationManager
    private final ImageStorageService imageStorageService; // Pour gérer les avatars

    // Constructeur pour l'injection de dépendances (préféré à @Autowired sur les champs)
    public AuthController(InscriptionService inscriptionService,
                          AuthenticationManager authenticationManager,
                          JwtService jwtService,
                          UserDetailsService userDetailsService,
                          ImageStorageService imageStorageService) {
        this.inscriptionService = inscriptionService;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.imageStorageService = imageStorageService;
    }

    // --- Endpoint d'Inscription Étudiant ---
    @PostMapping("/register/etudiant")
    public ResponseEntity<String> registerEtudiant(
            @ModelAttribute Etudiant etudiant, // Lie les champs simples (email, tel, etablissement, villeEtude, filiere, anneeEtude...) depuis FormData
            // Récupération explicite des champs nécessitant traitement/validation spécifique
            @RequestParam(value = "prenom") String prenom,
            @RequestParam(value = "nomDeFamille") String nomDeFamille,
            @RequestParam(value = "password") String password,
            @RequestParam(value = "accepteTerms") boolean accepteTerms,
            @RequestParam(value = "photoProfil", required = false) MultipartFile photoFile // Fichier optionnel
    ) {
        log.info("Requête reçue pour inscription étudiant (email potentiel: {})", etudiant.getEmail());
        try {
            // 1. Préparer l'entité Etudiant
            etudiant.setNom(prenom + " " + nomDeFamille); // Combiner nom/prénom
            etudiant.setPassword(password); // Mot de passe en clair (sera haché par le service)
            etudiant.setAccepteConditionsGenerales(accepteTerms); // Définir l'acceptation

            // 2. Gérer l'avatar si fourni
            String avatarDbIdentifier = null; // Identifiant à stocker en BDD
            if (photoFile != null && !photoFile.isEmpty()) {
                log.debug("Traitement du fichier avatar pour l'étudiant...");
                try {
                    // On suppose que storeImages gère une liste, même d'un seul élément
                    List<String> identifiers = imageStorageService.storeImages(List.of(photoFile), null); // Pas encore d'ID utilisateur
                    if (!identifiers.isEmpty()) {
                        avatarDbIdentifier = identifiers.get(0); // Prend le premier identifiant généré
                        log.info("Avatar étudiant sauvegardé sous l'identifiant : {}", avatarDbIdentifier);
                    }
                } catch (IOException e) {
                    log.error("Échec de la sauvegarde de l'avatar étudiant : {}", e.getMessage());
                    // Décider si l'inscription doit échouer ou continuer sans avatar
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body("Erreur serveur lors de la sauvegarde de l'image.");
                }
            }
            etudiant.setAvatar(avatarDbIdentifier); // Mettre l'identifiant (ou null) dans l'entité

            // 3. Appeler le service d'inscription
            log.debug("Appel InscriptionService.inscrireEtudiant pour {}", etudiant.getEmail());
            inscriptionService.inscrireEtudiant(etudiant);

            // 4. Retourner la réponse succès
            log.info("Inscription étudiant réussie pour : {}", etudiant.getEmail());
            return ResponseEntity.status(HttpStatus.CREATED).body("Etudiant inscrit avec succès.");

        } catch (IllegalArgumentException e) { // Erreur de validation métier (ex: email déjà pris)
            log.warn("Échec validation inscription étudiant (email: {}) : {}", etudiant.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Erreur : " + e.getMessage());
        } catch (RuntimeException e) { // Autres erreurs (BDD, etc.)
            log.error("Erreur interne inscription étudiant (email: {}) : {}", etudiant.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur interne du serveur lors de l'inscription.");
        }
    }

    // --- Endpoint d'Inscription Propriétaire ---
    @PostMapping("/register/proprietaire")
    public ResponseEntity<String> registerProprietaire(
            @ModelAttribute Proprietaire proprietaire, // Lie email, telephone...
            @RequestParam(value = "prenom") String prenom,
            @RequestParam(value = "nomDeFamille") String nomDeFamille,
            @RequestParam(value = "password") String password,
            @RequestParam(value = "accepteTerms") boolean accepteTerms,
            @RequestParam(value = "statut") String statut,
            @RequestParam(value = "nomAgence", required = false) String nomAgence, // Optionnel
            @RequestParam(value = "siret", required = false) String siret,       // Optionnel
            @RequestParam(value = "photoProfil", required = false) MultipartFile photoFile // Optionnel
    ) {
        log.info("Requête reçue pour inscription propriétaire (email potentiel: {})", proprietaire.getEmail());
        try {
            // 1. Préparer l'entité Proprietaire
            proprietaire.setNom(prenom + " " + nomDeFamille);
            proprietaire.setPassword(password); // Sera haché par le service
            proprietaire.setAccepteConditionsGenerales(accepteTerms);
            proprietaire.setStatut(statut);
            proprietaire.setNomAgence(nomAgence); // Sera null si non fourni
            proprietaire.setSiret(siret);         // Sera null si non fourni

            // 2. Gérer l'avatar si fourni (logique identique à l'étudiant)
            String avatarDbIdentifier = null;
            if (photoFile != null && !photoFile.isEmpty()) {
                log.debug("Traitement du fichier avatar pour le propriétaire...");
                try {
                    List<String> identifiers = imageStorageService.storeImages(List.of(photoFile), null);
                    if (!identifiers.isEmpty()) {
                        avatarDbIdentifier = identifiers.get(0);
                        log.info("Avatar propriétaire sauvegardé sous l'identifiant : {}", avatarDbIdentifier);
                    }
                } catch (IOException e) {
                    log.error("Échec de la sauvegarde de l'avatar propriétaire : {}", e.getMessage());
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body("Erreur serveur lors de la sauvegarde de l'image.");
                }
            }
            proprietaire.setAvatar(avatarDbIdentifier);

            // 3. Appeler le service d'inscription
            log.debug("Appel InscriptionService.inscrireProprietaire pour {}", proprietaire.getEmail());
            inscriptionService.inscrireProprietaire(proprietaire);

            // 4. Retourner la réponse succès
            log.info("Inscription propriétaire réussie pour : {}", proprietaire.getEmail());
            return ResponseEntity.status(HttpStatus.CREATED).body("Propriétaire inscrit avec succès.");

        } catch (IllegalArgumentException e) { // Erreur de validation métier
            log.warn("Échec validation inscription propriétaire (email: {}) : {}", proprietaire.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Erreur : " + e.getMessage());
        } catch (RuntimeException e) { // Autres erreurs
            log.error("Erreur interne inscription propriétaire (email: {}) : {}", proprietaire.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur interne du serveur lors de l'inscription.");
        }
    }

    // --- Endpoint de Login ---
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        log.info("Tentative de login pour : {}", loginRequest.getEmail());
        try {
            // 1. Tenter l'authentification via Spring Security
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getEmail(),    // Principal (doit correspondre à UserDetailsService)
                            loginRequest.getPassword()  // Credentials
                    )
            );
            log.debug("Authentification réussie pour : {}", loginRequest.getEmail());

            // 2. Récupérer les détails de l'utilisateur authentifié
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();

            // 3. Générer le token JWT
            String jwtToken = jwtService.generateToken(userDetails);
            log.info("Token JWT généré pour : {}", loginRequest.getEmail());

            // 4. Renvoyer une réponse 200 OK avec le token
            return ResponseEntity.ok(new LoginResponse(jwtToken)); // Utilise le DTO LoginResponse

        } catch (AuthenticationException e) { // Échec spécifique de l'authentification
            log.warn("Échec de l'authentification pour {} : {}", loginRequest.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Email ou mot de passe incorrect.");
        } catch (Exception e) { // Autres erreurs potentielles
            log.error("Erreur interne lors du login pour {}: {}", loginRequest.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erreur interne lors de la connexion.");
        }
    }
}