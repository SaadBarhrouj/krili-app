package com.saadbarhrouj.krili.model;

import com.saadbarhrouj.krili.builder.LogementBuilderImpl;
import com.saadbarhrouj.krili.model.state.*;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Entity
@Getter
@Setter
public class Logement {

    private static final Logger log = LoggerFactory.getLogger(Logement.class);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String adresseLigne1;

    @Column(nullable = false)
    private String codePostal;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ville_id", nullable = false)
    private Ville ville;

    private Double latitude;
    private Double longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeLogement type;

    @Column(nullable = false)
    private Integer nombreDePieces;

    @Column(nullable = false)
    private Double surface;

    @Column(nullable = false)
    private Double prix;

    @Column(nullable = false)
    private Boolean meuble = false;

    @Column(nullable = false, length = 2000)
    private String description;

    @Column(nullable = false)
    private LocalDate dateDisponibilite;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "logement_equipements", joinColumns = @JoinColumn(name = "logement_id"))
    @Column(name = "equipement")
    private List<String> equipements = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "logement_etablissements_proches",
            joinColumns = @JoinColumn(name = "logement_id"),
            inverseJoinColumns = @JoinColumn(name = "etablissement_id"))
    private Set<Etablissement> etablissementsProches = new HashSet<>();

    @OneToMany(mappedBy = "logement", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Image> images = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false)
    private StatutAnnonce statut = StatutAnnonce.BROUILLON;

    @Enumerated(EnumType.STRING)
    @Column(name = "niveau_premium", nullable = false)
    private NiveauPremium niveauPremium = NiveauPremium.STANDARD;

    private LocalDate premiumStartDate;
    private LocalDate premiumEndDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proprietaire_id", nullable = false)
    private final Proprietaire proprietaire;

    @Column(precision = 3, scale = 2, nullable = false, columnDefinition = "DECIMAL(3,2) DEFAULT 0.00")
    private BigDecimal avgRating = BigDecimal.ZERO;

    @Column(nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer reviewCount = 0;

    @Transient
    private transient AnnonceState currentState;

    protected Logement() {
        this.proprietaire = null;
        this.initializeStateOnLoad();
    }

    public Logement(LogementBuilderImpl builder) {
        this.adresseLigne1 = Objects.requireNonNull(builder.getAdresseLigne1(), "L'adresse (ligne 1) est obligatoire.").trim();
        if (this.adresseLigne1.isEmpty()) throw new IllegalArgumentException("L'adresse (ligne 1) ne peut pas être vide.");

        this.codePostal = Objects.requireNonNull(builder.getCodePostal(), "Le code postal est obligatoire.").trim();
        if (this.codePostal.isEmpty()) throw new IllegalArgumentException("Le code postal ne peut pas être vide.");

        this.ville = Objects.requireNonNull(builder.getVille(), "La ville est obligatoire.");
        this.type = Objects.requireNonNull(builder.getType(), "Le type de logement est obligatoire.");

        this.description = Objects.requireNonNull(builder.getDescription(), "La description est obligatoire.").trim();
        if (this.description.length() < 20) throw new IllegalArgumentException("La description doit contenir au moins 20 caractères.");

        this.prix = Objects.requireNonNull(builder.getPrix(), "Le prix est obligatoire.");
        if (this.prix <= 0) throw new IllegalArgumentException("Le prix doit être un nombre positif.");

        this.surface = Objects.requireNonNull(builder.getSurface(), "La surface est obligatoire.");
        if (this.surface <= 0) throw new IllegalArgumentException("La surface doit être positive.");

        this.nombreDePieces = Objects.requireNonNull(builder.getNombreDePieces(), "Le nombre de pièces est obligatoire.");
        if (this.nombreDePieces < 1) throw new IllegalArgumentException("Le nombre de pièces doit être au moins 1.");

        this.dateDisponibilite = Objects.requireNonNull(builder.getDateDisponibilite(), "La date de disponibilité est obligatoire.");
        this.proprietaire = Objects.requireNonNull(builder.getProprietaire(), "Le propriétaire est obligatoire.");

        this.id = builder.getId();
        this.meuble = builder.getMeuble();
        this.latitude = builder.getLatitude();
        this.longitude = builder.getLongitude();

        this.equipements = builder.getEquipements() != null ? new ArrayList<>(builder.getEquipements()) : new ArrayList<>();
        this.etablissementsProches = builder.getEtablissementsProches() != null ? new HashSet<>(builder.getEtablissementsProches()) : new HashSet<>();

        this.images = new ArrayList<>();
        List<Image> builderImages = builder.getImages();
        if (builderImages != null) {
            for (Image img : builderImages) {
                this.addImage(img);
            }
        }

        this.statut = builder.getStatut();
        this.niveauPremium = builder.getNiveauPremium();
        this.premiumStartDate = builder.getPremiumStartDate();
        this.premiumEndDate = builder.getPremiumEndDate();
        this.avgRating = builder.getAvgRating();
        this.reviewCount = builder.getReviewCount();

        this.initializeStateOnLoad();
    }

    @PostLoad
    public void initializeStateOnLoad() {
        if (this.statut == null) {
            log.warn("Logement ID {}: Statut était null, initialisation à BROUILLON.", this.id);
            this.statut = StatutAnnonce.BROUILLON;
        }
        switch (this.statut) {
            case ACTIVE: this.currentState = new ActiveState(); break;
            case RESERVEE: this.currentState = new ReservedState(); break;
            case LOUEE: this.currentState = new RentedState(); break;
            case ARCHIVEE: this.currentState = new ArchivedState(); break;
            case BROUILLON:
            default: this.currentState = new DraftState(); break;
        }
        if (this.id != null) {
            log.trace("Logement ID {}: currentState initialisé à {} (basé sur statut {}).", this.id, this.currentState.getClass().getSimpleName(), this.statut);
        }
    }

    private void ensureStateInitialized() {
        if (this.currentState == null) {
            initializeStateOnLoad();
            if (this.currentState == null) {
                throw new IllegalStateException("L'état interne de l'annonce (Logement ID: " + this.id + ") n'a pas pu être initialisé.");
            }
        }
    }

    public void setInternalState(AnnonceState newState) {
        this.currentState = Objects.requireNonNull(newState, "Le nouvel état (AnnonceState) ne peut être null.");
        this.setStatut(newState.getStatutAssocie());
        log.debug("Logement ID {}: Changement d'état interne vers {} (statut: {}).", this.id, newState.getClass().getSimpleName(), this.statut);
    }

    public void publier() {
        ensureStateInitialized();
        this.currentState.publier(this);
    }

    public void reserver() {
        ensureStateInitialized();
        this.currentState.reserver(this);
    }

    public void confirmerLocation() {
        ensureStateInitialized();
        this.currentState.confirmerLocation(this);
    }

    public void archiver() {
        ensureStateInitialized();
        this.currentState.archiver(this);
    }

    public void remettreEnLigne() {
        ensureStateInitialized();
        this.currentState.remettreEnLigne(this);
    }

    public void passerEnBrouillon() {
        ensureStateInitialized();
        this.currentState.passerEnBrouillon(this);
    }

    public void addImage(Image image) {
        if (image != null) {
            if (!this.images.contains(image)) {
                this.images.add(image);
                image.setLogement(this);
            }
        }
    }

}
