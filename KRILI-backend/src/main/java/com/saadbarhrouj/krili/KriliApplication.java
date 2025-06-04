package com.saadbarhrouj.krili;

import com.saadbarhrouj.krili.model.Etudiant;
import com.saadbarhrouj.krili.model.Proprietaire;
import com.saadbarhrouj.krili.repository.EtudiantRepository;
import com.saadbarhrouj.krili.repository.ProprietaireRepository;
import com.saadbarhrouj.krili.service.InscriptionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.transaction.annotation.Transactional;

@SpringBootApplication(scanBasePackages = {"com.saadbarhrouj.krili"})
@EntityScan("com.saadbarhrouj.krili.model")
@EnableAsync
public class KriliApplication {

    private static final Logger log = LoggerFactory.getLogger(KriliApplication.class);

    private final EtudiantRepository etudiantRepository;
    private final ProprietaireRepository proprietaireRepository;

    public KriliApplication(EtudiantRepository etudiantRepository, ProprietaireRepository proprietaireRepository) {
        this.etudiantRepository = etudiantRepository;
        this.proprietaireRepository = proprietaireRepository;
    }

    public static void main(String[] args) {
        SpringApplication.run(KriliApplication.class, args);
    }

    @Bean
    @Transactional
    public CommandLineRunner simpleInscriptionTestRunner(InscriptionService inscriptionService) {
        return args -> {
            log.info("\n\n--- DÉMARRAGE Test Inscription Utilisateurs (Template Method avec Email) ---");

            String emailEtudiantTest = "saad.barhrouj2001@gmail.com";
            try {
                if (etudiantRepository.findByEmail(emailEtudiantTest).isPresent()) {
                    log.info(">>> Étudiant de test {} existe déjà. Inscription sautée.", emailEtudiantTest);
                } else {
                    Etudiant etudiantTest = new Etudiant();
                    etudiantTest.setNom("Alice Etudiante TestEmail");
                    etudiantTest.setEmail(emailEtudiantTest);
                    etudiantTest.setPassword("password123");
                    etudiantTest.setTelephone("0611111111");
                    etudiantTest.setEtablissement("Université Test Krili");
                    etudiantTest.setVilleEtude("KriliVille");
                    etudiantTest.setFiliere("Génie Logiciel");
                    etudiantTest.setAnneeEtude(1);
                    etudiantTest.setAccepteConditionsGenerales(true);

                    inscriptionService.inscrireEtudiant(etudiantTest);
                    log.info(">>> Étudiant de test inscrit avec succès (email devrait être envoyé) : {}", etudiantTest.getEmail());
                }
                etudiantRepository.findByEmail(emailEtudiantTest).ifPresent(etu -> {
                    log.info(">>>> Étudiant trouvé en base : ID={}, Nom={}, Email={}, Rôles={}",
                            etu.getId(), etu.getNom(), etu.getEmail(), etu.getRoles());
                });

            } catch (IllegalArgumentException e) {
                log.error("!!! Erreur lors de l'inscription de l'étudiant de test {} (IllegalArgumentException) : {}", emailEtudiantTest, e.getMessage());
            } catch (Exception e) {
                log.error("!!! Erreur inattendue lors de l'inscription de l'étudiant de test {} : {}", emailEtudiantTest, e.getMessage(), e);
            }

            String emailProprietaireTest = "saad.barhrouj20012@gmail.com";
            try {
                if (proprietaireRepository.findByEmail(emailProprietaireTest).isPresent()) {
                    log.info(">>> Propriétaire particulier de test {} existe déjà. Inscription sautée.", emailProprietaireTest);
                } else {
                    Proprietaire proprietaireTest = new Proprietaire();
                    proprietaireTest.setNom("Bob Proprietaire TestEmail");
                    proprietaireTest.setEmail(emailProprietaireTest);
                    proprietaireTest.setPassword("password456");
                    proprietaireTest.setTelephone("0622222222");
                    proprietaireTest.setStatut("particulier");
                    proprietaireTest.setAccepteConditionsGenerales(true);

                    inscriptionService.inscrireProprietaire(proprietaireTest);
                    log.info(">>> Propriétaire particulier de test inscrit avec succès (email devrait être envoyé) : {}", proprietaireTest.getEmail());
                }
                proprietaireRepository.findByEmail(emailProprietaireTest).ifPresent(prop -> {
                    log.info(">>>> Propriétaire trouvé en base : ID={}, Nom={}, Email={}, Rôles={}, Statut={}",
                            prop.getId(), prop.getNom(), prop.getEmail(), prop.getRoles(), prop.getStatut());
                });

            } catch (IllegalArgumentException e) {
                log.error("!!! Erreur lors de l'inscription du propriétaire particulier de test {} (IllegalArgumentException) : {}", emailProprietaireTest, e.getMessage());
            } catch (Exception e) {
                log.error("!!! Erreur inattendue lors de l'inscription du propriétaire particulier de test {} : {}", emailProprietaireTest, e.getMessage(), e);
            }

            if (etudiantRepository.findByEmail(emailEtudiantTest).isPresent()) {
                try {
                    Etudiant etudiantDupliqueTest = new Etudiant();
                    etudiantDupliqueTest.setNom("Test Dupliqué Etudiant");
                    etudiantDupliqueTest.setEmail(emailEtudiantTest);
                    etudiantDupliqueTest.setPassword("password123");
                    etudiantDupliqueTest.setTelephone("0600000004");
                    etudiantDupliqueTest.setEtablissement("Autre Fac");
                    etudiantDupliqueTest.setVilleEtude("Autre Ville");
                    etudiantDupliqueTest.setFiliere("Autre Filiere");
                    etudiantDupliqueTest.setAnneeEtude(1);
                    etudiantDupliqueTest.setAccepteConditionsGenerales(true);

                    inscriptionService.inscrireEtudiant(etudiantDupliqueTest);
                    log.error("!!! TEST D'EMAIL DUPLIQUÉ ÉCHOUÉ : L'inscription avec email dupliqué ({}) aurait dû échouer.", emailEtudiantTest);

                } catch (IllegalArgumentException e) {
                    log.info(">>> TEST D'EMAIL DUPLIQUÉ RÉUSSI : L'inscription avec email dupliqué ({}) a correctement échoué : {}", emailEtudiantTest, e.getMessage());
                } catch (Exception e) {
                    log.error("!!! Erreur inattendue lors du test d'email dupliqué ({}) : {}", emailEtudiantTest, e.getMessage(), e);
                }
            }

            log.info("\n--- FIN Test Inscription Utilisateurs (vérifiez votre boîte mail !) ---");
        };
    }
}
