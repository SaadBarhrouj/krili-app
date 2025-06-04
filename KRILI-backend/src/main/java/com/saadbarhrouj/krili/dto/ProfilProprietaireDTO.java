// ===============================================================
// FICHIER : src/main/java/com/saadbarhrouj/krili/dto/ProfilProprietaireDTO.java
// (Version pour voir/modifier le profil du propri??taire connect?? + voir nb abonn??s)
// ===============================================================
package com.saadbarhrouj.krili.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object pour les informations du profil du propri??taire connect??.
 * Utilis?? pour afficher les d??tails dans la page "Mon Profil", permettre la modification
 * de certains champs (nom, t??l??phone, avatar), et afficher le nombre d'abonn??s.
 */
@Data // Annotation Lombok (Getters, Setters, toString, equals, hashCode)
@NoArgsConstructor // Constructeur sans arguments
@AllArgsConstructor // Constructeur avec tous les arguments
public class ProfilProprietaireDTO {

    // --- Informations Identifiantes (G??n??ralement non modifiables par l'utilisateur) ---
    private Long id;        // ID unique de l'utilisateur propri??taire
    private String email;   // Email (utilis?? pour la connexion)

    // --- Informations Modifiables ---
    private String nom;       // Nom complet du propri??taire
    private String telephone; // Num??ro de t??l??phone

    // --- Avatar ---
    // L'identifiant String de l'image (ex: "uuid.jpg").
    // Le frontend construira l'URL compl??te avec ce champ.
    // Ce champ est lu pour l'affichage et potentiellement mis ?? jour si un nouvel avatar est upload??.
    private String avatar;

    // --- Informations Professionnelles (G??n??ralement informatives ici, pas modifiables) ---
    private String statut;    // "particulier" ou "agence"
    private String nomAgence; // Nom de l'agence (peut ??tre null si particulier)
    // private String siret; // Le SIRET n'est g??n??ralement pas affich??/modifi?? ici
    private String siret; // Le SIRET est maintenant inclus dans le DTO

    // --- Informations Suppl??mentaires (Non modifiables via ce DTO) ---
    // Nombre d'??tudiants qui se sont abonn??s ?? ce propri??taire.
    // Cette information est lue seulement, pas ??crite lors d'une mise ?? jour du profil.
    private Long nombreAbonnes;

    // Optionnel : Ajouter d'autres champs informatifs si pertinent
    // private String address;
    // private java.time.LocalDateTime dateInscription;

}