package com.saadbarhrouj.krili.service;

import com.saadbarhrouj.krili.model.Etudiant;
import com.saadbarhrouj.krili.model.Proprietaire;
import com.saadbarhrouj.krili.model.Utilisateur;
import com.saadbarhrouj.krili.repository.EtudiantRepository;
import com.saadbarhrouj.krili.repository.ProprietaireRepository;
import com.saadbarhrouj.krili.repository.UtilisateurRepository;
import com.saadbarhrouj.krili.service.EmailService; // N'oubliez pas cet import
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InscriptionService {

    private static final Logger log = LoggerFactory.getLogger(InscriptionService.class);

    private final EtudiantRepository etudiantRepository;
    private final ProprietaireRepository proprietaireRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService; // Injection de EmailService

    public InscriptionService(EtudiantRepository etudiantRepository,
                              ProprietaireRepository proprietaireRepository,
                              UtilisateurRepository utilisateurRepository,
                              PasswordEncoder passwordEncoder,
                              EmailService emailService) { // EmailService dans le constructeur
        this.etudiantRepository = etudiantRepository;
        this.proprietaireRepository = proprietaireRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService; // Affectation
    }

    @Transactional
    public Etudiant inscrireEtudiant(Etudiant etudiant) {
        log.info("Service d'inscription : D??but inscription ??tudiant pour l'email {}", etudiant.getEmail());
        etudiant.setPassword(passwordEncoder.encode(etudiant.getPassword()));
        etudiant.setActive(true);
        Etudiant etudiantInscrit = inscrireUtilisateur(etudiant, etudiantRepository);
        log.info("Service d'inscription : Fin inscription ??tudiant pour l'email {}. ID: {}", etudiant.getEmail(), etudiantInscrit.getId());
        return etudiantInscrit;
    }

    @Transactional
    public Proprietaire inscrireProprietaire(Proprietaire proprietaire) {
        log.info("Service d'inscription : D??but inscription propri??taire pour l'email {}", proprietaire.getEmail());
        proprietaire.setPassword(passwordEncoder.encode(proprietaire.getPassword()));
        proprietaire.setActive(true);
        Proprietaire proprietaireInscrit = inscrireUtilisateur(proprietaire, proprietaireRepository);
        log.info("Service d'inscription : Fin inscription propri??taire pour l'email {}. ID: {}", proprietaire.getEmail(), proprietaireInscrit.getId());
        return proprietaireInscrit;
    }

    private <T extends Utilisateur> T inscrireUtilisateur(T utilisateur, org.springframework.data.jpa.repository.JpaRepository<T, Long> repository) {
        log.debug("M??thode inscrireUtilisateur pour l'email : {}", utilisateur.getEmail());
        try {
            if (utilisateurRepository.existsByEmail(utilisateur.getEmail())) {
                log.warn("Tentative d'inscription avec un email d??j?? existant : {}", utilisateur.getEmail());
                throw new IllegalArgumentException("Cet email est d??j?? utilis??.");
            }

            utilisateur.inscrire(emailService); // Passer emailService ?? la m??thode template
            log.debug("M??thode template `utilisateur.inscrire()` appel??e et termin??e pour {}. R??les apr??s appel: {}", utilisateur.getEmail(), utilisateur.getRoles());

            T utilisateurSauvegarde = repository.save(utilisateur);
            log.info("Utilisateur {} ({}) sauvegard?? avec succ??s avec ID: {}.",
                    utilisateurSauvegarde.getEmail(),
                    utilisateurSauvegarde.getClass().getSimpleName(),
                    utilisateurSauvegarde.getId());
            return utilisateurSauvegarde;

        } catch (IllegalArgumentException e) {
            log.error("Erreur de validation lors de l'inscription de {}: {}", utilisateur.getEmail(), e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Erreur technique lors de l'inscription de {}: {}", utilisateur.getEmail(), e.getMessage(), e);
            throw new RuntimeException("Erreur interne du serveur lors de l'inscription.", e);
        }
    }
}