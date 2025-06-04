package com.saadbarhrouj.krili.builder;

import com.saadbarhrouj.krili.model.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.*;

@Getter
public class LogementBuilderImpl implements ILogementBuilder {
    private Long id;
    private String adresseLigne1;
    private String codePostal;
    private Ville ville;
    private TypeLogement type;
    private String description;
    private Double prix;
    private Double surface;
    private Boolean meuble = false;
    private Integer nombreDePieces;
    private List<String> equipements = new ArrayList<>();
    private Set<Etablissement> etablissementsProches = new HashSet<>();
    private List<Image> images = new ArrayList<>();
    private StatutAnnonce statut = StatutAnnonce.BROUILLON;
    private NiveauPremium niveauPremium = NiveauPremium.STANDARD;
    private LocalDate dateDisponibilite;
    private Proprietaire proprietaire;
    private Double latitude;
    private Double longitude;
    private LocalDate premiumStartDate;
    private LocalDate premiumEndDate;
    private BigDecimal avgRating = BigDecimal.ZERO;
    private Integer reviewCount = 0;

    public LogementBuilderImpl() {}

    @Override
    public ILogementBuilder id(Long id) {
        this.id = id;
        return this;
    }

    @Override
    public ILogementBuilder adresseLigne1(String val) {
        this.adresseLigne1 = val;
        return this;
    }

    @Override
    public ILogementBuilder codePostal(String val) {
        this.codePostal = val;
        return this;
    }

    @Override
    public ILogementBuilder ville(Ville val) {
        this.ville = val;
        return this;
    }

    @Override
    public ILogementBuilder latitude(Double val) {
        this.latitude = val;
        return this;
    }

    @Override
    public ILogementBuilder longitude(Double val) {
        this.longitude = val;
        return this;
    }

    @Override
    public ILogementBuilder type(TypeLogement val) {
        this.type = val;
        return this;
    }

    @Override
    public ILogementBuilder description(String val) {
        this.description = val;
        return this;
    }

    @Override
    public ILogementBuilder prix(Double val) {
        this.prix = val;
        return this;
    }

    @Override
    public ILogementBuilder surface(Double val) {
        this.surface = val;
        return this;
    }

    @Override
    public ILogementBuilder meuble(Boolean val) {
        this.meuble = (val != null) ? val : false;
        return this;
    }

    @Override
    public ILogementBuilder nombreDePieces(Integer val) {
        this.nombreDePieces = val;
        return this;
    }

    @Override
    public ILogementBuilder addImage(Image image) {
        if (image != null) this.images.add(image);
        return this;
    }

    @Override
    public ILogementBuilder equipements(List<String> val) {
        this.equipements = (val != null) ? new ArrayList<>(val) : new ArrayList<>();
        return this;
    }

    @Override
    public ILogementBuilder etablissementsProches(Set<Etablissement> val) {
        this.etablissementsProches = (val != null) ? new HashSet<>(val) : new HashSet<>();
        return this;
    }

    @Override
    public ILogementBuilder images(List<Image> val) {
        this.images = (val != null) ? new ArrayList<>(val) : new ArrayList<>();
        return this;
    }

    @Override
    public ILogementBuilder statut(StatutAnnonce val) {
        this.statut = (val != null) ? val : StatutAnnonce.BROUILLON;
        return this;
    }

    @Override
    public ILogementBuilder niveauPremium(NiveauPremium val) {
        this.niveauPremium = (val != null) ? val : NiveauPremium.STANDARD;
        return this;
    }

    @Override
    public ILogementBuilder dateDisponibilite(LocalDate val) {
        this.dateDisponibilite = val;
        return this;
    }

    @Override
    public ILogementBuilder proprietaire(Proprietaire val) {
        this.proprietaire = val;
        return this;
    }

    @Override
    public ILogementBuilder premiumStartDate(LocalDate val) {
        this.premiumStartDate = val;
        return this;
    }

    @Override
    public ILogementBuilder premiumEndDate(LocalDate val) {
        this.premiumEndDate = val;
        return this;
    }

    @Override
    public ILogementBuilder avgRating(BigDecimal val) {
        this.avgRating = (val != null) ? val : BigDecimal.ZERO;
        return this;
    }

    @Override
    public ILogementBuilder reviewCount(Integer val) {
        this.reviewCount = (val != null && val >= 0) ? val : 0;
        return this;
    }

    @Override
    public Logement build() {
        return new Logement(this);
    }
}
