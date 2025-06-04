package com.saadbarhrouj.krili.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
public class Proprietaire extends Utilisateur {

    private static final Logger log = LoggerFactory.getLogger(Proprietaire.class);

    @Column(nullable = false)
    private String statut;

    @Column
    private String nomAgence;

    @Column
    private String siret;

    public Proprietaire() {
    }

    @Override
    protected void validerDonnees() {
        super.validerDonneesUtilisateurDeBase();
        if (statut == null || statut.trim().isEmpty()) {
            throw new IllegalArgumentException("Le statut du propriétaire est obligatoire.");
        }
        if ("agence".equalsIgnoreCase(statut.trim())) {
            if (nomAgence == null || nomAgence.trim().isEmpty()) {
                throw new IllegalArgumentException("Le nom de l'agence est obligatoire pour un statut 'agence'.");
            }
            if (siret == null || siret.trim().isEmpty()) {
                throw new IllegalArgumentException("Le SIRET est obligatoire pour un statut 'agence'.");
            }
        }
        super.verifierConditions();
    }

    @Override
    protected void configurerAutorisations() {
        log.info("Configuration des autorisations pour le propriétaire {}. Attribution du rôle ROLE_PROPRIETAIRE.", getEmail());
        List<String> rolesProprio = new ArrayList<>();
        rolesProprio.add("ROLE_PROPRIETAIRE");
        this.setRoles(rolesProprio);
    }

    @Override
    protected WelcomeNotificationDetails preparerDetailsNotificationBienvenue() {
        log.info("Préparation des détails de la notification de bienvenue pour le propriétaire {}.", getEmail());
        String subject = "Bienvenue sur KRILI, Propriétaire " + getNom() + " !";
        String htmlContent = String.format(
                "<h1>Bienvenue sur KRILI, %s !</h1>" +
                        "<p>Votre compte propriétaire a été créé avec succès. Vous pouvez commencer à gérer vos biens.</p>" +
                        "<p>Prochaines étapes pour louer vos logements :</p>" +
                        "<ul>" +
                        "<li><a href='http://localhost:4200/proprietaire/profil'>Complétez votre profil propriétaire</a>.</li>" +
                        "<li><a href='http://localhost:4200/proprietaire/logements/nouveau'>Publiez votre premier logement</a>.</li>" +
                        "<li>Consultez votre tableau de bord pour suivre vos annonces.</li>" +
                        "</ul>" +
                        "<p>Cordialement,<br>L'équipe KRILI</p>",
                getNom()
        );
        return new WelcomeNotificationDetails(subject, htmlContent);
    }
}