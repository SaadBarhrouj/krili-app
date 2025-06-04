package com.saadbarhrouj.krili.service.facade;

import com.saadbarhrouj.krili.builder.ILogementBuilder;
import com.saadbarhrouj.krili.builder.LogementBuilderImpl;
import com.saadbarhrouj.krili.dto.AnnonceCreationDTO;
import com.saadbarhrouj.krili.model.*;
import com.saadbarhrouj.krili.repository.EtablissementRepository;
import com.saadbarhrouj.krili.repository.LogementRepository;
import com.saadbarhrouj.krili.repository.VilleRepository;
import com.saadbarhrouj.krili.service.ImageStorageService;
import com.saadbarhrouj.krili.service.LogementService;
import com.saadbarhrouj.krili.service.NotificationCreationService;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AnnoncePublicationFacadeImpl implements AnnoncePublicationFacade {

    private static final Logger log = LoggerFactory.getLogger(AnnoncePublicationFacadeImpl.class);

    private final LogementService logementService;
    private final ImageStorageService imageService;
    private final VilleRepository villeRepository;
    private final EtablissementRepository etablissementRepository;
    private final NotificationCreationService notificationCreationService;
    private final LogementRepository logementRepository;

    @Autowired
    public AnnoncePublicationFacadeImpl(LogementService logementService,
                                        ImageStorageService imageService,
                                        VilleRepository villeRepository,
                                        EtablissementRepository etablissementRepository,
                                        NotificationCreationService notificationCreationService,
                                        LogementRepository logementRepository) {
        this.logementService = logementService;
        this.imageService = imageService;
        this.villeRepository = villeRepository;
        this.etablissementRepository = etablissementRepository;
        this.notificationCreationService = notificationCreationService;
        this.logementRepository = logementRepository;
    }

    @Override
    @Transactional
    public Logement creerOuMettreAJourAnnonce(AnnonceCreationDTO dto,
                                           Proprietaire proprietaire,
                                           List<MultipartFile> fichiersImages) {
        log.info("FACADE - Création logement pour proprietaire ID: {}", proprietaire.getId());

        // 1. Valider DTO et charger entités associées (Ville, Etablissements)
        Objects.requireNonNull(dto, "Le DTO de création ne peut être null.");
        Objects.requireNonNull(proprietaire, "Le propriétaire ne peut être null.");
        Ville ville = chargerVille(dto.getVilleId());
        Set<Etablissement> etablissementsProches = chargerEtablissements(dto.getEtablissementIds(), ville);

        // 2. Construire l'objet Logement avec le Builder
        ILogementBuilder builder = new LogementBuilderImpl();
        Logement nouveauLogement = builder
                .adresseLigne1(dto.getAdresseLigne1())
                .codePostal(dto.getCodePostal())
                .ville(ville)
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .type(dto.getType())
                .prix(dto.getPrix())
                .surface(dto.getSurface())
                .nombreDePieces(dto.getNombreDePieces())
                .description(dto.getDescription())
                .meuble(dto.getMeuble() != null && dto.getMeuble())
                .statut(dto.getStatut() != null ? dto.getStatut() : StatutAnnonce.BROUILLON)
                .niveauPremium(dto.getNiveauPremium() != null ? dto.getNiveauPremium() : NiveauPremium.STANDARD)
                .dateDisponibilite(dto.getDateDisponibilite())
                .proprietaire(proprietaire)
                .equipements(dto.getEquipements())
                .etablissementsProches(etablissementsProches)
                .build();

        // 3. Gérer les images
        stockerEtLierImages(fichiersImages, nouveauLogement);

        // 4. Appliquer logique Premium (dates de début/fin)
        applyPremiumLogic(nouveauLogement);

        // 5. Sauvegarder le logement via LogementService (qui gère aussi l'initialisation de l'état)
        Logement logementSauvegarde = logementService.creerLogement(nouveauLogement);
        log.info("FACADE - Logement créé (ID: {})", logementSauvegarde.getId());

        // 6. Envoyer notifications si l'annonce est active
        if (logementSauvegarde.getStatut() == StatutAnnonce.ACTIVE) {
            notificationCreationService.notifyNewLogementFromProprietaire(logementSauvegarde.getProprietaire(), logementSauvegarde);
        }
        return logementSauvegarde;
    }

    @Override
    @Transactional
    public Logement mettreAJourAnnonce(Long logementId,
                                                 AnnonceCreationDTO dto,
                                                 Proprietaire proprietaireConnecte,
                                                 List<MultipartFile> fichiersImages) {
        log.info("FACADE - Mise à jour logement ID: {} par proprietaire ID: {}", logementId, proprietaireConnecte.getId());

        // 1. Valider DTO et charger le logement existant (vérifie aussi l'appartenance)
        Objects.requireNonNull(logementId, "L'ID du logement est requis pour la mise à jour.");
        Objects.requireNonNull(dto, "Le DTO de mise à jour ne peut être null.");
        Objects.requireNonNull(proprietaireConnecte, "Le propriétaire connecté ne peut être null.");

        Logement logementExistant = logementRepository.findByIdAndProprietaireId(logementId, proprietaireConnecte.getId())
                .orElseThrow(() -> new EntityNotFoundException("Logement non trouvé (ID: " + logementId + ") ou non appartenant au propriétaire (ID: " + proprietaireConnecte.getId() + ")."));

        // 2. Préparer les données pour la mise à jour (Ville et Etablissements ne changent généralement pas via ce DTO)
        Ville ville = logementExistant.getVille(); // On garde la ville existante par défaut
        if (dto.getVilleId() != null && !dto.getVilleId().equals(ville.getId())) {
            log.info("FACADE - Changement de ville détecté pour logement ID: {}. Ancienne: {}, Nouvelle: {}", logementId, ville.getId(), dto.getVilleId());
            ville = chargerVille(dto.getVilleId());
        }
        Set<Etablissement> etablissementsProches = logementExistant.getEtablissementsProches();
        if (dto.getEtablissementIds() != null) { // Permet de mettre à jour les établissements
            etablissementsProches = chargerEtablissements(dto.getEtablissementIds(), ville);
        }


        ILogementBuilder builder = new LogementBuilderImpl();
        builder.id(logementExistant.getId()) // Important pour que JPA sache que c'est une MàJ
                .proprietaire(proprietaireConnecte)
                .statut(dto.getStatut() != null ? dto.getStatut() : logementExistant.getStatut());

        builder.adresseLigne1(valOrDefault(dto.getAdresseLigne1(), logementExistant.getAdresseLigne1()));
        builder.codePostal(valOrDefault(dto.getCodePostal(), logementExistant.getCodePostal()));
        builder.ville(ville); // La ville mise à jour ou l'existante
        builder.latitude(dto.getLatitude() != null ? dto.getLatitude() : logementExistant.getLatitude());
        builder.longitude(dto.getLongitude() != null ? dto.getLongitude() : logementExistant.getLongitude());
        builder.type(dto.getType() != null ? dto.getType() : logementExistant.getType());
        builder.prix(dto.getPrix() != null ? dto.getPrix() : logementExistant.getPrix());
        builder.surface(dto.getSurface() != null ? dto.getSurface() : logementExistant.getSurface());
        builder.nombreDePieces(dto.getNombreDePieces() != null ? dto.getNombreDePieces() : logementExistant.getNombreDePieces());
        builder.description(valOrDefault(dto.getDescription(), logementExistant.getDescription()));
        builder.meuble(dto.getMeuble() != null ? dto.getMeuble() : logementExistant.getMeuble());
        builder.dateDisponibilite(dto.getDateDisponibilite() != null ? dto.getDateDisponibilite() : logementExistant.getDateDisponibilite());
        builder.niveauPremium(dto.getNiveauPremium() != null ? dto.getNiveauPremium() : logementExistant.getNiveauPremium());
        builder.equipements(dto.getEquipements() != null ? dto.getEquipements() : logementExistant.getEquipements());
        builder.etablissementsProches(etablissementsProches);
        builder.avgRating(logementExistant.getAvgRating());
        builder.reviewCount(logementExistant.getReviewCount());


        Logement logementPourMaj = builder.build();

        // 4. Gérer les images: Supprimer les anciennes, puis ajouter les nouvelles
        logementPourMaj.getImages().clear(); // Supprime les anciennes liaisons d'images de l'entité
        // TODO: Ajouter la logique de suppression des fichiers images du stockage physique si nécessaire (ImageStorageService)
        stockerEtLierImages(fichiersImages, logementPourMaj); // Ajoute les nouvelles

        // 5. Appliquer logique Premium
        applyPremiumLogic(logementPourMaj);

        // 6. Sauvegarder via LogementRepository ou LogementService.
        // Puisque LogementService.modifierLogement prend un ID et un LogementDTO,
        // et que nous avons une entité Logement entièrement construite,
        // nous pouvons utiliser directement logementRepository.save()
        // Ou alors, adapter LogementService.modifierLogement pour prendre une entité.
        // Pour l'instant, utilisons le repository pour plus de contrôle direct dans la facade.
        Logement logementMisAJour = logementRepository.save(logementPourMaj);
        log.info("FACADE - Logement ID {} mis à jour", logementMisAJour.getId());

        // 7. Envoyer notifications si des changements importants (géré par le LogementService si on passait par lui)
        // Ici, on pourrait le faire manuellement si LogementService.modifierLogement n'est pas appelé.
        // Par exemple, si le statut a changé pour ACTIVE :
        if (logementExistant.getStatut() != StatutAnnonce.ACTIVE && logementMisAJour.getStatut() == StatutAnnonce.ACTIVE) {
            notificationCreationService.notifyLogementUpdate(logementMisAJour, Notification.NotificationType.LOGEMENT_STATUS_CHANGED_ACTIVE,
                    String.format("Le logement '%s' est de nouveau disponible.", logementMisAJour.getAdresseLigne1()));
        } else if (logementExistant.getPrix() == null || (dto.getPrix() != null && !logementExistant.getPrix().equals(dto.getPrix())) ||
                (dto.getDescription() != null && !logementExistant.getDescription().equals(dto.getDescription())) ) {
            // Ou si d'autres champs importants ont changé
            notificationCreationService.notifyLogementUpdate(logementMisAJour, Notification.NotificationType.LOGEMENT_UPDATED,
                    String.format("Les détails du logement '%s' ont été mis à jour.", logementMisAJour.getAdresseLigne1()));
        }


        return logementMisAJour;
    }

    // --- Méthodes privées utilitaires ---

    private Ville chargerVille(Long villeId) {
        return villeRepository.findById(Objects.requireNonNull(villeId, "L'ID de la ville est requis."))
                .orElseThrow(() -> new EntityNotFoundException("Ville non trouvée avec ID: " + villeId));
    }

    private Set<Etablissement> chargerEtablissements(Set<Long> etablissementIds, Ville villeReference) {
        Set<Etablissement> etablissements = new HashSet<>();
        if (etablissementIds != null && !etablissementIds.isEmpty()) {
            for (Long etabId : etablissementIds) {
                etablissementRepository.findById(etabId).ifPresent(etab -> {
                    if (etab.getVille().getId().equals(villeReference.getId())) {
                        etablissements.add(etab);
                    } else {
                        log.warn("FACADE - Établissement ID {} n'appartient pas à la ville {}. Ignoré.", etabId, villeReference.getNom());
                    }
                });
            }
        }
        return etablissements;
    }

    private List<String> stockerEtLierImages(List<MultipartFile> fichiersImages, Logement logement) {
        if (fichiersImages == null || fichiersImages.isEmpty()) {
            log.debug("FACADE - Aucune image fournie pour le logement ID: {}", logement.getId() != null ? logement.getId() : "nouveau");
            return new ArrayList<>();
        }
        List<MultipartFile> validFiles = fichiersImages.stream()
                .filter(f -> f != null && !f.isEmpty())
                .collect(Collectors.toList());

        if (validFiles.isEmpty()) {
            return new ArrayList<>();
        }
        try {
            List<String> imageIdentifiers = imageService.storeImages(validFiles, logement.getId()); // Passe l'ID si dispo
            for (String identifier : imageIdentifiers) {
                Image imageEntite = Image.builder().url(identifier).logement(logement).build(); // Utilisation du builder d'Image
                logement.addImage(imageEntite);
            }
            return imageIdentifiers;
        } catch (IOException e) {
            log.error("FACADE - Erreur IO pendant le stockage des images: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la sauvegarde des images.", e);
        }
    }

    private void applyPremiumLogic(Logement logement) {
        NiveauPremium niveauPremium = logement.getNiveauPremium();
        if (niveauPremium == NiveauPremium.PREMIUM) {
            logement.setPremiumStartDate(LocalDate.now());
            logement.setPremiumEndDate(LocalDate.now().plusDays(15));
        } else if (niveauPremium == NiveauPremium.ULTIMATE) {
            logement.setPremiumStartDate(LocalDate.now());
            logement.setPremiumEndDate(LocalDate.now().plusMonths(1));
        } else {
            logement.setPremiumStartDate(null);
            logement.setPremiumEndDate(null);
        }
    }

    private <T> T valOrDefault(T newValue, T defaultValue) {
        return newValue != null ? newValue : defaultValue;
    }
}