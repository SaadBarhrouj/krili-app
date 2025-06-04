package com.saadbarhrouj.krili.dto;

import com.saadbarhrouj.krili.model.NiveauPremium;
import com.saadbarhrouj.krili.model.StatutAnnonce;
import com.saadbarhrouj.krili.model.TypeLogement;
import jakarta.validation.constraints.*; // Import pour les annotations de validation
import java.time.LocalDate;
import java.util.List;
import java.util.Set; // Pour les etablissementIds

// Lombok pour moins de boilerplate (optionnel, mais si vous l'utilisez ailleurs)
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AnnonceCreationDTO {

    // --- LOCALISATION ---
    @NotBlank(message = "L'adresse (ligne 1) est obligatoire")
    @Size(max = 255, message = "L'adresse ne doit pas dépasser 255 caractères")
    private String adresseLigne1;

    @NotBlank(message = "Le code postal est obligatoire")
    @Size(max = 10, message = "Le code postal ne doit pas dépasser 10 caractères")
    private String codePostal;

    @NotNull(message = "La ville est obligatoire")
    private Long villeId; // ID de l'entité Ville sélectionnée

    @Size(max = 100, message = "Le quartier ne doit pas dépasser 100 caractères")
    private String quartier; // Optionnel

    // --- GEOLOCALISATION (Optionnelle, peut être calculée ou fournie) ---
    private Double latitude;
    private Double longitude;

    // --- CARACTÉRISTIQUES PRINCIPALES ---
    @NotNull(message = "Le type de logement est obligatoire")
    private TypeLogement type;

    @NotNull(message = "Le nombre de pièces est obligatoire")
    @Min(value = 1, message = "Le nombre de pièces doit être au moins 1")
    private Integer nombreDePieces;

    @NotNull(message = "La surface est obligatoire")
    @Positive(message = "La surface doit être un nombre positif")
    private Double surface;

    @NotNull(message = "Le prix est obligatoire")
    @Positive(message = "Le prix doit être un nombre positif")
    private Double prix;

    @NotNull(message = "L'information meublé/non meublé est obligatoire")
    private Boolean meuble;

    @NotBlank(message = "La description est obligatoire")
    @Size(min = 20, max = 2000, message = "La description doit contenir entre 20 et 2000 caractères")
    private String description;

    // --- ÉQUIPEMENTS ET PROXIMITÉ ---
    private List<String> equipements; // Liste des clés/noms des équipements

    private Set<Long> etablissementIds; // Liste des IDs des établissements proches sélectionnés

    // --- DISPONIBILITÉ ET PUBLICATION ---
    @NotNull(message = "La date de disponibilité est obligatoire")
    // @FutureOrPresent(message = "La date de disponibilité ne peut pas être dans le passé") // Optionnel, si vous voulez cette validation
    private LocalDate dateDisponibilite;

    @NotNull(message = "Le statut de l'annonce est obligatoire")
    private StatutAnnonce statut;

    @NotNull(message = "Le niveau premium est obligatoire")
    private NiveauPremium niveauPremium;

}