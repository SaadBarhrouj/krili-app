// ========================================================================
// FICHIER: KRILI-backend\src\main\java\com\saadbarhrouj\krili\service\LogementService.java
// RÔLE: Service gérant la logique métier pour les logements, incluant
//       l'application de décorateurs pour enrichir les données avant la conversion en DTO.
// ========================================================================
package com.saadbarhrouj.krili.service;

// Imports pour le Builder
import com.saadbarhrouj.krili.builder.ILogementBuilder;
import com.saadbarhrouj.krili.builder.LogementBuilderImpl;

// Imports pour les DTOs et Modèles
import com.saadbarhrouj.krili.dto.LogementDTO;
import com.saadbarhrouj.krili.model.*; // Importe toutes les entités nécessaires

// Imports pour les Repositories
import com.saadbarhrouj.krili.repository.LogementRepository;
import com.saadbarhrouj.krili.repository.ReservationRepository;

// Imports pour le Pattern Strategy (Recherche)
import com.saadbarhrouj.krili.strategy.*;

// Imports pour le Pattern Decorator
import com.saadbarhrouj.krili.decorator.AnnonceComponent;
import com.saadbarhrouj.krili.decorator.ConcreteAnnonce;
import com.saadbarhrouj.krili.decorator.PremiumBadgeDecorator;
import com.saadbarhrouj.krili.decorator.TopListingDecorator;
import com.saadbarhrouj.krili.decorator.NouveauteBadgeDecorator; // N'oubliez pas cet import

// Imports JPA et Spring
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.server.ResponseStatusException;

// Imports Java Utilitaires
import java.time.LocalDate;
import java.time.temporal.ChronoUnit; // Pour le NouveauteBadgeDecorator
import java.util.*;
import java.util.stream.Collectors;

@Service
@Validated // Active la validation pour les méthodes de ce service (si des contraintes sont utilisées sur les paramètres)
public class LogementService {

    private static final Logger log = LoggerFactory.getLogger(LogementService.class);

    private final LogementRepository logementRepository;
    private final Map<String, RechercheStrategy> rechercheStrategies = new HashMap<>();
    private final NotificationCreationService notificationCreationService;
    private final ReservationRepository reservationRepository;

    // ========================================================================
    // Constructeur et Initialisation des Stratégies
    // ========================================================================
    @Autowired
    public LogementService(LogementRepository logementRepository,
                           NotificationCreationService notificationCreationService,
                           ReservationRepository reservationRepository) {
        this.logementRepository = logementRepository;
        this.notificationCreationService = notificationCreationService;
        this.reservationRepository = reservationRepository;

        // Initialisation des strat??gies de recherche
        rechercheStrategies.put("prix", new RechercheParPrix());
        rechercheStrategies.put("type", new RechercheParType());
        rechercheStrategies.put("adresse", new RechercheParAdresse());
        rechercheStrategies.put("etablissement", new RechercheParEtablissement());
        rechercheStrategies.put("ville", new RechercheParVille());
    }


    private AnnonceComponent applyDecorators(Logement logement) {
        AnnonceComponent annonceComp = new ConcreteAnnonce(logement); // Base

        // Appliquer PremiumBadgeDecorator si PREMIUM ou ULTIMATE
        if (logement.getNiveauPremium() == NiveauPremium.PREMIUM || logement.getNiveauPremium() == NiveauPremium.ULTIMATE) {
            annonceComp = new PremiumBadgeDecorator(annonceComp);
            log.trace("Logement ID {}: PremiumBadgeDecorator appliqu??.", logement.getId());
        }

        // Appliquer TopListingDecorator si PREMIUM ou ULTIMATE, avec des scores diff??rents
        if (logement.getNiveauPremium() == NiveauPremium.ULTIMATE) {
            annonceComp = new TopListingDecorator(annonceComp, 20); // Boost plus ??lev?? pour Ultimate
            log.trace("Logement ID {}: TopListingDecorator appliqu?? (boost 20 pour ULTIMATE).", logement.getId());
        } else if (logement.getNiveauPremium() == NiveauPremium.PREMIUM) {
            annonceComp = new TopListingDecorator(annonceComp, 10); // Boost pour Premium
            log.trace("Logement ID {}: TopListingDecorator appliqu?? (boost 10 pour PREMIUM).", logement.getId());
        }

        // Appliquer NouveauteBadgeDecorator
        // Condition : si la date de disponibilit?? est dans le futur, ou dans les 7 derniers jours.
        LocalDate dateReferencePourNouveaute = logement.getDateDisponibilite();
        if (dateReferencePourNouveaute != null) {
            boolean estDansLeFuturOuAujourdhui = dateReferencePourNouveaute.isAfter(LocalDate.now().minusDays(1));
            boolean estDansLePasseRecent = dateReferencePourNouveaute.isBefore(LocalDate.now().plusDays(1)) &&
                    ChronoUnit.DAYS.between(dateReferencePourNouveaute, LocalDate.now()) <= 7;
            if (estDansLeFuturOuAujourdhui || estDansLePasseRecent) {
                annonceComp = new NouveauteBadgeDecorator(annonceComp);
                log.trace("Logement ID {}: NouveauteBadgeDecorator appliqu??.", logement.getId());
            }
        }
        return annonceComp;
    }


    public LogementDTO convertToDto(AnnonceComponent annonceComp) {
        if (annonceComp == null || annonceComp.getLogementData() == null) {
            log.warn("Tentative de conversion en DTO d'un AnnonceComponent null ou sans LogementData.");
            return null;
        }
        Logement logement = annonceComp.getLogementData(); // R??cup??rer le logement de base
        LogementDTO dto = new LogementDTO();

        dto.setId(logement.getId());
        dto.setAdresseLigne1(logement.getAdresseLigne1() != null ? logement.getAdresseLigne1() : "");
        dto.setCodePostal(logement.getCodePostal() != null ? logement.getCodePostal() : "");
        if (logement.getVille() != null) {
            dto.setNomVille(logement.getVille().getNom() != null ? logement.getVille().getNom() : "");
        } else {
            dto.setNomVille("");
        }
        dto.setType(logement.getType());
        dto.setDescription(annonceComp.getFormattedDescription() != null ? annonceComp.getFormattedDescription() : "Aucune description."); // Utilise la description du d??corateur
        dto.setPrix(logement.getPrix());
        dto.setSurface(logement.getSurface());
        dto.setMeuble(logement.getMeuble());
        dto.setNombreDePieces(logement.getNombreDePieces());
        dto.setEquipements(logement.getEquipements() != null ? new ArrayList<>(logement.getEquipements()) : new ArrayList<>());
        dto.setNomsEtablissementsProches(logement.getEtablissementsProches() != null ? logement.getEtablissementsProches().stream().map(etab -> etab.getNom() != null ? etab.getNom() : "").collect(Collectors.toSet()) : Collections.emptySet());
        dto.setPhotos(logement.getImages() != null ? logement.getImages().stream().map(img -> img.getUrl() != null ? img.getUrl() : "").collect(Collectors.toList()) : new ArrayList<>());
        dto.setStatut(logement.getStatut());
        dto.setNiveauPremium(logement.getNiveauPremium()); // Garde le niveau brut pour info
        dto.setDateDisponibilite(logement.getDateDisponibilite());
        dto.setPremiumStartDate(logement.getPremiumStartDate());
        dto.setPremiumEndDate(logement.getPremiumEndDate());
        dto.setLatitude(logement.getLatitude());
        dto.setLongitude(logement.getLongitude());
        if (logement.getProprietaire() != null) {
            dto.setProprietaireId(logement.getProprietaire().getId());
            dto.setProprietaireNom(logement.getProprietaire().getNom() != null ? logement.getProprietaire().getNom() : "");
            dto.setProprietaireAvatarId(logement.getProprietaire().getAvatar());
        } else {
            dto.setProprietaireNom("");
        }
        dto.setDisplayBadges(annonceComp.getDisplayBadges()); // Ajoute les badges g??n??r??s par les d??corateurs
        // log.trace("Logement ID {} converti en DTO avec badges: {}", logement.getId(), dto.getDisplayBadges());
        return dto;
    }


    public LogementDTO convertToDtoWithDetails(Logement logement) {
        if (logement == null) {
            log.warn("Tentative de convertToDtoWithDetails pour un logement null.");
            return null;
        }
        AnnonceComponent annonceComp = applyDecorators(logement); // Appliquer les d??corateurs
        LogementDTO dto = convertToDto(annonceComp);              // Appeler la version modifi??e qui prend AnnonceComponent
        if (dto == null) return null; // S??curit??

        // La logique pour prochaineDateDisponibilitePotentielle reste la m??me, utilisant 'logement'
        if (logement.getStatut() == StatutAnnonce.RESERVEE || logement.getStatut() == StatutAnnonce.LOUEE) {
            Optional<Reservation> latestReservation = reservationRepository.findTopByLogementIdAndStatusInOrderByEndDateDesc(
                    logement.getId(),
                    Arrays.asList(Reservation.ReservationStatus.CONFIRMED, Reservation.ReservationStatus.ONGOING)
            );
            latestReservation.ifPresent(res -> {
                dto.setProchaineDateDisponibilitePotentielle(res.getEndDate().plusDays(1));
            });
        }
        // NOUVEAU : Mapper les infos d'avis
        dto.setAvgRating(logement.getAvgRating()); // Récupère de l'entité Logement
        dto.setReviewCount(logement.getReviewCount()); // Récupère de l'entité Logement
        return dto;
    }

    // ========================================================================
    // Opérations CRUD (Create, Read, Update, Delete)
    // ========================================================================

    /**
     * Crée un nouveau logement en base de données.
     * Les décorateurs ne sont généralement pas appliqués à la création brute,
     * mais lors de la récupération pour affichage/traitement.
     * @param logement Le Logement à créer.
     * @return Le Logement sauvegardé.
     */
    @Transactional
    public Logement creerLogement(Logement logement) {
        Objects.requireNonNull(logement, "L'objet Logement ne peut ??tre null pour la cr??ation.");
        log.info("LogementService: Cr??ation du logement (Adresse: {}).", logement.getAdresseLigne1());
        logement.setId(null); // Assure une nouvelle entit??

        if (logement.getImages() != null) {
            logement.getImages().forEach(image -> image.setLogement(logement));
        }
        // La logique pour premiumStartDate/EndDate et statut est g??r??e par AnnoncePublicationFacade ou l'entit?? elle-m??me.

        Logement logementSauvegarde = logementRepository.save(logement);
        log.info("LogementService: Logement (ID: {}) cr???? avec succ??s. Statut: {}, Premium: {}",
                logementSauvegarde.getId(), logementSauvegarde.getStatut(), logementSauvegarde.getNiveauPremium());
        return logementSauvegarde;
    }


    @Transactional
    public Logement modifierLogement(Long id, LogementDTO dtoModifications) {
        Objects.requireNonNull(id, "ID du logement requis pour modification.");
        Objects.requireNonNull(dtoModifications, "DTO de modification requis.");

        Logement existant = logementRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Logement non trouv?? pour modification, ID : " + id));
        log.info("SERVICE: Modification du logement ID {}.", id);

        Double ancienPrix = existant.getPrix();
        String ancienneDesc = existant.getDescription(); // Description brute avant d??coration

        ILogementBuilder builder = new LogementBuilderImpl();
        builder.id(existant.getId());
        builder.proprietaire(existant.getProprietaire());
        builder.statut(existant.getStatut()); // Le statut est g??r?? par le State Pattern

        builder.adresseLigne1(dtoModifications.getAdresseLigne1() != null ? dtoModifications.getAdresseLigne1() : existant.getAdresseLigne1());
        builder.codePostal(dtoModifications.getCodePostal() != null ? dtoModifications.getCodePostal() : existant.getCodePostal());
        builder.ville(existant.getVille());
        builder.type(dtoModifications.getType() != null ? dtoModifications.getType() : existant.getType());
        builder.nombreDePieces(dtoModifications.getNombreDePieces() != null ? dtoModifications.getNombreDePieces() : existant.getNombreDePieces());
        builder.surface(dtoModifications.getSurface() != null ? dtoModifications.getSurface() : existant.getSurface());
        builder.meuble(dtoModifications.getMeuble() != null ? dtoModifications.getMeuble() : existant.getMeuble());
        builder.dateDisponibilite(dtoModifications.getDateDisponibilite() != null ? dtoModifications.getDateDisponibilite() : existant.getDateDisponibilite());
        builder.prix(dtoModifications.getPrix() != null ? dtoModifications.getPrix() : existant.getPrix());
        builder.description(dtoModifications.getDescription() != null ? dtoModifications.getDescription() : existant.getDescription()); // Prend la description du DTO
        builder.latitude(dtoModifications.getLatitude() != null ? dtoModifications.getLatitude() : existant.getLatitude());
        builder.longitude(dtoModifications.getLongitude() != null ? dtoModifications.getLongitude() : existant.getLongitude());
        builder.equipements(dtoModifications.getEquipements() != null ? dtoModifications.getEquipements() : existant.getEquipements());
        builder.etablissementsProches(existant.getEtablissementsProches()); // Pour l'instant, pas modifiable via ce DTO simple
        existant.getImages().forEach(builder::addImage); // Conserve les images existantes

        NiveauPremium newPremium = dtoModifications.getNiveauPremium() != null ? dtoModifications.getNiveauPremium() : existant.getNiveauPremium();
        builder.niveauPremium(newPremium);
        if (newPremium != existant.getNiveauPremium() || (newPremium != NiveauPremium.STANDARD && existant.getPremiumEndDate() == null)) {
            applyPremiumLogicOnUpdate(builder, newPremium); // Utilise une m??thode helper pour le builder
        } else {
            builder.premiumStartDate(existant.getPremiumStartDate()).premiumEndDate(existant.getPremiumEndDate());
        }

        Logement logementReconstruit = builder.build();
        Logement logementSauvegarde = logementRepository.save(logementReconstruit);

        // Notification si le prix ou la description (brute) a chang??
        // Note: la description du DTO peut d??j?? ??tre la description "d??cor??e" si elle a ??t?? modifi??e par l'utilisateur.
        // Il est plus s??r de comparer avec la description brute de `existant` avant la modification.
        boolean aChangeDeContenu = !Objects.equals(ancienPrix, logementSauvegarde.getPrix()) ||
                !Objects.equals(ancienneDesc, logementSauvegarde.getDescription());
        if (aChangeDeContenu) {
            triggerLogementUpdateNotification(logementSauvegarde, Notification.NotificationType.LOGEMENT_UPDATED, "Les d??tails du logement ont ??t?? mis ?? jour.");
        }
        log.info("SERVICE: Logement ID {} modifi?? et sauvegard??.", logementSauvegarde.getId());
        return logementSauvegarde;
    }

    // M??thode helper pour appliquer la logique premium au builder lors de la modification
    private void applyPremiumLogicOnUpdate(ILogementBuilder builder, NiveauPremium newNiveauPremium) {
        if (newNiveauPremium == NiveauPremium.PREMIUM) {
            builder.premiumStartDate(LocalDate.now()).premiumEndDate(LocalDate.now().plusDays(15));
        } else if (newNiveauPremium == NiveauPremium.ULTIMATE) {
            builder.premiumStartDate(LocalDate.now()).premiumEndDate(LocalDate.now().plusMonths(1));
        } else { // STANDARD
            builder.premiumStartDate(null).premiumEndDate(null);
        }
    }

    @Transactional
    public void supprimerLogement(Long id) {
        Objects.requireNonNull(id, "L'ID du logement est requis pour la suppression.");
        log.info("LogementService: Tentative de suppression du logement ID: {}.", id);
        if (!logementRepository.existsById(id)) {
            throw new EntityNotFoundException("Logement non trouv?? pour suppression avec ID : " + id);
        }
        // TODO: Ajouter logique de notification des favoris, suppression des abonnements, etc.
        logementRepository.deleteById(id);
        log.info("LogementService: Logement ID: {} supprim??.", id);
    }

    // ========================================================================
    // Méthodes de Lecture (utilisent les décorateurs pour enrichir les DTOs)
    // ========================================================================

    /**
     * Récupère un logement par son ID, applique les décorateurs, et le convertit en DTO.
     * @param id L'ID du logement.
     * @return Un LogementDTO enrichi.
     * @throws EntityNotFoundException si le logement n'est pas trouvé.
     */
    @Transactional(readOnly = true)
    public LogementDTO getLogement(Long id) {
        Objects.requireNonNull(id, "L'ID du logement est requis.");
        log.debug("LogementService: R??cup??ration du logement ID: {}.", id);
        return logementRepository.findById(id)
                .map(this::convertToDtoWithDetails) // Applique d??corateurs et conversion enrichie
                .orElseThrow(() -> new EntityNotFoundException("Logement non trouv?? avec ID : " + id));
    }

    /**
     * Récupère tous les logements, applique les décorateurs à chacun, et les convertit en DTOs.
     * @return Une liste de LogementDTOs enrichis.
     */
    @Transactional(readOnly = true)
    public List<LogementDTO> getAllLogements() {
        log.info("LogementService: R??cup??ration de tous les logements.");
        List<Logement> logements = logementRepository.findAll();
        log.debug("LogementService: {} logements trouv??s en base.", logements.size());
        return logements.stream()
                .map(this::convertToDtoWithDetails) // Applique d??corateurs et conversion enrichie
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LogementDTO> getLogementsByProprietaireId(Long proprietaireId) {
        Objects.requireNonNull(proprietaireId, "L'ID du propri??taire est requis.");
        log.debug("LogementService: R??cup??ration des logements pour propri??taire ID: {}.", proprietaireId);
        return logementRepository.findByProprietaireId(proprietaireId).stream()
                .map(this::convertToDtoWithDetails) // Applique d??corateurs et conversion enrichie
                .collect(Collectors.toList());
    }

    // ========================================================================
    // Recherche de Logements (utilise les décorateurs pour le tri par score)
    // ========================================================================
    @Transactional(readOnly = true)
    public List<LogementDTO> rechercherLogements(LogementRechercheCriteria criteria, String strategieName) {
        Objects.requireNonNull(criteria, "Les crit??res de recherche ne peuvent ??tre null");
        log.info("LogementService: D??but recherche. Strat??gie: '{}', Crit??res: VilleID={}, Type={}, PrixMax={}, Etabs={}, Adresse='{}'",
                strategieName, criteria.getVilleId(), criteria.getType(), criteria.getPrixMax(), criteria.getEtablissementIds(), criteria.getAdresse());

        // 1. R??cup??rer tous les logements actifs
        List<Logement> logementsActifs = logementRepository.findAll().stream()
                .filter(l -> l.getStatut() == StatutAnnonce.ACTIVE)
                .collect(Collectors.toList());
        log.debug("LogementService: {} logements actifs trouv??s initialement.", logementsActifs.size());

        // 2. Appliquer les d??corateurs ?? chaque logement actif
        List<AnnonceComponent> annoncesDecorees = logementsActifs.stream()
                .map(this::applyDecorators)
                .collect(Collectors.toList());
        log.debug("LogementService: {} annonces d??cor??es.", annoncesDecorees.size());

        // 3. Appliquer les filtres de base sur les AnnonceComponent (en acc??dant ?? logementData)
        List<AnnonceComponent> annoncesPreFiltrees = annoncesDecorees.stream()
                .filter(ac -> {
                    Logement l = ac.getLogementData();
                    boolean passe = true;
                    if (criteria.getVilleId() != null && (l.getVille() == null || !l.getVille().getId().equals(criteria.getVilleId()))) passe = false;
                    if (passe && criteria.getType() != null && l.getType() != criteria.getType()) passe = false;
                    if (passe && criteria.getPrixMax() != null && criteria.getPrixMax() > 0 && (l.getPrix() == null || l.getPrix() > criteria.getPrixMax())) passe = false;
                    // Ajouter d'autres filtres de base ici si n??cessaire
                    return passe;
                })
                .collect(Collectors.toList());
        log.debug("LogementService: {} annonces apr??s pr??-filtrage de base.", annoncesPreFiltrees.size());

        // 4. Appliquer la strat??gie de recherche sp??cifique
        List<AnnonceComponent> annoncesFiltreesParStrategie;
        if (strategieName != null && !strategieName.trim().isEmpty()) {
            RechercheStrategy strategie = rechercheStrategies.get(strategieName.toLowerCase());
            if (strategie == null) {
                throw new IllegalArgumentException("Strat??gie de recherche non valide : " + strategieName);
            }
            // La strat??gie op??re sur List<Logement>, on doit donc extraire les logements
            List<Logement> logementsPourStrategie = annoncesPreFiltrees.stream()
                    .map(AnnonceComponent::getLogementData)
                    .collect(Collectors.toList());
            List<Logement> logementsResultatStrategie = strategie.rechercher(logementsPourStrategie, criteria);
            Set<Long> idsResultatStrategie = logementsResultatStrategie.stream().map(Logement::getId).collect(Collectors.toSet());

            // On filtre notre liste d'AnnonceComponent d??j?? pr??-filtr??s
            annoncesFiltreesParStrategie = annoncesPreFiltrees.stream()
                    .filter(ac -> idsResultatStrategie.contains(ac.getLogementData().getId()))
                    .collect(Collectors.toList());
            log.debug("LogementService: {} annonces apr??s application de la strat??gie '{}'.", annoncesFiltreesParStrategie.size(), strategieName);
        } else {
            annoncesFiltreesParStrategie = annoncesPreFiltrees; // Pas de strat??gie sp??cifique, on garde les pr??-filtr??s
        }

        // 5. Trier les r??sultats finaux par score de boost (gr??ce au TopListingDecorator)
        List<AnnonceComponent> annoncesTriee = annoncesFiltreesParStrategie.stream()
                .sorted(Comparator.comparingInt(AnnonceComponent::getSearchBoostScore).reversed()) // Tri descendant
                .collect(Collectors.toList());
        log.debug("LogementService: {} annonces tri??es par score de boost.", annoncesTriee.size());

        // 6. Convertir en DTO pour l'envoi
        return annoncesTriee.stream()
                .map(ac -> convertToDtoWithDetails(ac.getLogementData())) // Convertit le Logement sous-jacent
                .collect(Collectors.toList());
    }


    // ========================================================================
    // Méthodes de Changement d'État (Pattern State)
    // ========================================================================
    // Ces m??thodes op??rent sur l'entit?? Logement et sont appel??es par le LogementController.
    // Le LogementController s'occupe ensuite de la conversion en DTO via convertToDtoWithDetails.

    private Logement changeLogementState(Long logementId, Long proprietaireId,
                                         java.util.function.Consumer<Logement> stateChangeAction,
                                         String actionDescription) {
        Logement logement = logementRepository.findByIdAndProprietaireId(logementId, proprietaireId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Logement non trouv?? (ID: " + logementId + ") ou action non autoris??e pour le propri??taire (ID: " + proprietaireId + ")."));
        StatutAnnonce statutAvant = logement.getStatut();
        try {
            stateChangeAction.accept(logement); // Le Pattern State met ?? jour logement.statut
            StatutAnnonce statutApres = logement.getStatut();
            Logement logementSauvegarde = logementRepository.save(logement);
            log.info("Action '{}' pour logement ID {}. Statut: {} -> {}", actionDescription, logementId, statutAvant, statutApres);
            if (statutAvant != statutApres) {
                Notification.NotificationType typeNotif = mapStatutToNotificationType(statutApres);
                if (typeNotif != null) {
                    String message = String.format("Le statut du logement '%s' est maintenant : %s.",
                            truncate(logementSauvegarde.getAdresseLigne1(), 30),
                            statutApres.toString().toLowerCase().replace("_", " "));
                    triggerLogementUpdateNotification(logementSauvegarde, typeNotif, message);
                }
            }
            return logementSauvegarde;
        } catch (IllegalStateException e) {
            log.warn("Transition d'??tat invalide pour '{}' sur Logement ID {}: {}", actionDescription, logementId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Action '" + actionDescription + "' non permise dans l'??tat actuel du logement: " + e.getMessage(), e);
        }
    }
    @Transactional public Logement publierLogement(Long id, Long proprietaireId) { return changeLogementState(id, proprietaireId, Logement::publier, "publication"); }
    @Transactional public Logement archiverLogement(Long id, Long proprietaireId) { return changeLogementState(id, proprietaireId, Logement::archiver, "archivage"); }
    @Transactional public Logement reserverLogement(Long id, Long proprietaireIdDuLogement) { return changeLogementState(id, proprietaireIdDuLogement, Logement::reserver, "r??servation par propri??taire"); }
    @Transactional public Logement confirmerLocationLogement(Long id, Long proprietaireId) { return changeLogementState(id, proprietaireId, Logement::confirmerLocation, "confirmation de location"); }
    @Transactional public Logement remettreEnLigneLogement(Long id, Long proprietaireId) { return changeLogementState(id, proprietaireId, Logement::remettreEnLigne, "remise en ligne"); }
    @Transactional public Logement passerEnBrouillonLogement(Long id, Long proprietaireId) { return changeLogementState(id, proprietaireId, Logement::passerEnBrouillon, "passage en brouillon"); }


    private Notification.NotificationType mapStatutToNotificationType(StatutAnnonce statut) {
        switch (statut) {
            case ACTIVE:    return Notification.NotificationType.LOGEMENT_STATUS_CHANGED_ACTIVE;
            case RESERVEE:  return Notification.NotificationType.LOGEMENT_STATUS_CHANGED_RESERVEE;
            case LOUEE:     return Notification.NotificationType.LOGEMENT_STATUS_CHANGED_LOUEE;
            case ARCHIVEE:  return Notification.NotificationType.LOGEMENT_STATUS_CHANGED_ARCHIVEE;
            default:        return null;
        }
    }
    private void triggerLogementUpdateNotification(Logement logement, Notification.NotificationType type, String customMessage) {
        if (logement == null || logement.getProprietaire() == null) {
            log.warn("Notification de mise ?? jour de logement annul??e (Logement ID: {}). Logement ou Propri??taire null.", logement != null ? logement.getId() : "null");
            return;
        }
        try {
            log.debug("D??clenchement de notifyLogementUpdate pour Logement ID {} - Type: {}, Message: '{}'", logement.getId(), type, customMessage);
            notificationCreationService.notifyLogementUpdate(logement, type, customMessage);
        } catch (Exception e) {
            log.error("Erreur (non bloquante) lors du d??clenchement de la notification de M??J (Type: {}) pour logement ID {}: {}", type, logement.getId(), e.getMessage(), e);
        }
    }
    private String truncate(String value, int length) {
        if (value == null) return "";
        return value.length() <= length ? value : value.substring(0, length) + "...";
    }

    @Transactional(readOnly = true)
    public boolean existsLogementByIdAndProprietaireId(Long logementId, Long proprietaireId) {
        return logementRepository.existsByIdAndProprietaireId(logementId, proprietaireId);
    }

    @Transactional(readOnly = true)
    public Optional<Logement> findLogementEntityByIdAndProprietaire(Long logementId, Long proprietaireId) {
        return logementRepository.findByIdAndProprietaireId(logementId, proprietaireId);
    }
}