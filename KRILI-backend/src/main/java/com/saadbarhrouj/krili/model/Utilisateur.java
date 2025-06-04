package com.saadbarhrouj.krili.model;

import com.saadbarhrouj.krili.service.EmailService;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@Entity
@Inheritance(strategy = InheritanceType.JOINED)
@Getter
@Setter
public abstract class Utilisateur implements UserDetails {

    private static final Logger log = LoggerFactory.getLogger(Utilisateur.class);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String telephone;

    @Column(length = 500)
    private String address;

    @Column(length = 255)
    private String avatar;

    @Column(precision = 3, scale = 2, columnDefinition = "DECIMAL(3,2) default 0.00")
    private BigDecimal avgRating = BigDecimal.ZERO;

    @Column(columnDefinition = "INT default 0")
    private Integer reviewCount = 0;

    @Column(nullable = false)
    private boolean accepteConditionsGenerales = false;

    private boolean active = false;

    @Column(updatable = false)
    private LocalDateTime dateInscription;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "utilisateur_roles", joinColumns = @JoinColumn(name = "utilisateur_id"))
    @Column(name = "role")
    private List<String> roles;

    public static class WelcomeNotificationDetails {
        public final String subject;
        public final String htmlContent;

        public WelcomeNotificationDetails(String subject, String htmlContent) {
            this.subject = subject;
            this.htmlContent = htmlContent;
        }
    }

    protected abstract WelcomeNotificationDetails preparerDetailsNotificationBienvenue();

    public final void inscrire(EmailService emailService) {
        log.debug("Début de la méthode template inscrire() pour {}", getEmail());
        validerDonnees();
        log.debug("Données validées pour {}", getEmail());
        enregistrerDateInscription();
        log.debug("Date d'inscription enregistrée pour {}", getEmail());
        configurerAutorisations();
        log.debug("Autorisations configurées pour {}. Rôles: {}", getEmail(), getRoles());

        WelcomeNotificationDetails detailsNotification = preparerDetailsNotificationBienvenue();
        if (detailsNotification != null && emailService != null) {
            log.debug("Préparation à l'envoi de l'email de bienvenue pour {}", getEmail());
            emailService.sendWelcomeEmail(this.getEmail(), detailsNotification.subject, detailsNotification.htmlContent);
        } else {
            log.warn("EmailService ou détails de notification non fournis, email de bienvenue non envoyé pour {}.", getEmail());
        }

        activerCompteHook();
        log.debug("Fin de la méthode template inscrire() pour {}", getEmail());
    }

    protected void validerDonneesUtilisateurDeBase() {
        if (this.email == null || this.email.trim().isEmpty()) {
            throw new IllegalArgumentException("L'email est obligatoire.");
        }
        if (this.nom == null || this.nom.trim().isEmpty()) {
            throw new IllegalArgumentException("Le nom est obligatoire.");
        }
        if (this.password == null || this.password.isEmpty()) {
            throw new IllegalArgumentException("Le mot de passe ne peut pas être vide.");
        }
        if (this.telephone == null || this.telephone.trim().isEmpty()) {
            throw new IllegalArgumentException("Le téléphone est obligatoire.");
        }
    }

    protected void verifierConditions() {
        if (!this.accepteConditionsGenerales) {
            throw new IllegalArgumentException("Vous devez accepter les conditions générales.");
        }
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (roles == null) {
            return List.of();
        }
        return roles.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return this.active;
    }

    protected abstract void validerDonnees();
    protected abstract void configurerAutorisations();

    private void enregistrerDateInscription() {
        if (this.dateInscription == null) {
            this.dateInscription = LocalDateTime.now();
        }
    }

    protected void activerCompteHook() {
        log.debug("Hook activerCompteHook() appelé pour {}. Statut actif : {}", getEmail(), this.isActive());
    }
}