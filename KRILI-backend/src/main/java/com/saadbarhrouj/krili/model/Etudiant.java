package com.saadbarhrouj.krili.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@Entity
@Getter
@Setter
public class Etudiant extends Utilisateur {

    private static final Logger log = LoggerFactory.getLogger(Etudiant.class);

    @Column(nullable = false)
    private String etablissement;

    @Column(nullable = false)
    private String villeEtude;

    @Column(nullable = false)
    private String filiere;

    @Column(nullable = false)
    private int anneeEtude;

    public Etudiant() {
    }

    @Override
    protected void validerDonnees() {
        super.validerDonneesUtilisateurDeBase();
        if (etablissement == null || etablissement.trim().isEmpty()) {
            throw new IllegalArgumentException("L'établissement est obligatoire.");
        }
        if (villeEtude == null || villeEtude.trim().isEmpty()) {
            throw new IllegalArgumentException("La ville d'étude est obligatoire.");
        }
        if (filiere == null || filiere.trim().isEmpty()) {
            throw new IllegalArgumentException("La filière est obligatoire.");
        }
        if (anneeEtude <= 0) {
            throw new IllegalArgumentException("L'année d'étude doit être positive.");
        }
        super.verifierConditions();
    }

    @Override
    protected void configurerAutorisations() {
        log.info("Configuration des autorisations pour l'étudiant {}. Attribution du rôle ROLE_ETUDIANT.", getEmail());
        this.setRoles(List.of("ROLE_ETUDIANT"));
    }

    @Override
    protected WelcomeNotificationDetails preparerDetailsNotificationBienvenue() {
        log.info("Préparation des détails de la notification de bienvenue pour l'étudiant {}.", getEmail());
        String subject = "Bienvenue sur KRILI, " + getNom() + " !";
        String htmlContent = String.format(
                "<h1>Bienvenue sur KRILI, %s !</h1>" +
                        "<p>Votre compte étudiant a été créé avec succès.</p>" +
                        "<p>Prochaines étapes pour trouver votre logement idéal :</p>" +
                        "<ul>" +
                        "<li><a href='http://localhost:4200/etudiant/profil'>Complétez votre profil</a>.</li>" +
                        "<li><a href='http://localhost:4200/annonces'>Commencez votre recherche de logements</a>.</li>" +
                        "<li>N'hésitez pas à ajouter des logements à vos favoris !</li>" +
                        "</ul>" +
                        "<p>Cordialement,<br>L'équipe KRILI</p>",
                getNom()
        );
        return new WelcomeNotificationDetails(subject, htmlContent);
    }
}