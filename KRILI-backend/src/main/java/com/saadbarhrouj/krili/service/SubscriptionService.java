package com.saadbarhrouj.krili.service;

import com.saadbarhrouj.krili.dto.LogementDTO;
import com.saadbarhrouj.krili.model.*;
import com.saadbarhrouj.krili.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class SubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionService.class);

    private final SubscriptionRepository subscriptionRepository;
    private final EtudiantRepository etudiantRepository;
    private final ProprietaireRepository proprietaireRepository;
    private final LogementRepository logementRepository;
    private final LogementService logementService;

    @Autowired
    public SubscriptionService(
            SubscriptionRepository subscriptionRepository,
            EtudiantRepository etudiantRepository,
            ProprietaireRepository proprietaireRepository,
            LogementRepository logementRepository,
            LogementService logementService) {
        this.subscriptionRepository = subscriptionRepository;
        this.etudiantRepository = etudiantRepository;
        this.proprietaireRepository = proprietaireRepository;
        this.logementRepository = logementRepository;
        this.logementService = logementService;
    }

    @Transactional
    public Subscription subscribeToProprietaire(Long etudiantId, Long proprietaireId) {
        if (subscriptionRepository.existsByEtudiantIdAndProprietaireId(etudiantId, proprietaireId)) {
            log.warn("Tentative d'abonnement dupliqué : Etudiant ID {} à Proprietaire ID {}", etudiantId, proprietaireId);
            throw new IllegalStateException("Déjà abonné à ce propriétaire.");
        }
        Etudiant etudiant = findEtudiant(etudiantId);
        Proprietaire proprietaire = findProprietaire(proprietaireId);
        Subscription sub = Subscription.builder().etudiant(etudiant).proprietaire(proprietaire).build();
        Subscription saved = subscriptionRepository.save(sub);
        log.info("Etudiant ID {} s'est abonné au Proprietaire ID {}", etudiantId, proprietaireId);
        return saved;
    }

    @Transactional
    public void unsubscribeFromProprietaire(Long etudiantId, Long proprietaireId) {
        subscriptionRepository.findByEtudiantIdAndProprietaireId(etudiantId, proprietaireId)
                .ifPresent(sub -> {
                    subscriptionRepository.delete(sub);
                    log.info("Etudiant ID {} s'est désabonné du Proprietaire ID {}", etudiantId, proprietaireId);
                });
    }

    @Transactional(readOnly = true)
    public boolean isSubscribedToProprietaire(Long etudiantId, Long proprietaireId) {
        return subscriptionRepository.existsByEtudiantIdAndProprietaireId(etudiantId, proprietaireId);
    }

    @Transactional(readOnly = true)
    public long countAbonnesByProprietaireId(Long proprietaireId) {
        log.debug("Comptage des abonnés pour le propriétaire ID: {}", proprietaireId);
        if (proprietaireId == null) {
            log.warn("Tentative de comptage d'abonnés pour un ID propriétaire null.");
            return 0;
        }
        return subscriptionRepository.countByProprietaireId(proprietaireId);
    }

    @Transactional
    public Subscription subscribeToLogement(Long etudiantId, Long logementId) {
        if (subscriptionRepository.existsByEtudiantIdAndLogementId(etudiantId, logementId)) {
            log.warn("Tentative d'ajout de favori dupliqué : Etudiant ID {} pour Logement ID {}", etudiantId, logementId);
            throw new IllegalStateException("Ce logement est déjà dans vos favoris.");
        }
        Etudiant etudiant = findEtudiant(etudiantId);
        Logement logement = findLogement(logementId);
        Subscription sub = Subscription.builder().etudiant(etudiant).logement(logement).build();
        Subscription saved = subscriptionRepository.save(sub);
        log.info("Etudiant ID {} a ajouté le Logement ID {} aux favoris", etudiantId, logementId);
        return saved;
    }

    @Transactional
    public void unsubscribeFromLogement(Long etudiantId, Long logementId) {
        subscriptionRepository.findByEtudiantIdAndLogementId(etudiantId, logementId)
                .ifPresent(sub -> {
                    subscriptionRepository.delete(sub);
                    log.info("Etudiant ID {} a retiré le Logement ID {} des favoris", etudiantId, logementId);
                });
    }

    @Transactional(readOnly = true)
    public boolean isSubscribedToLogement(Long etudiantId, Long logementId) {
        return subscriptionRepository.existsByEtudiantIdAndLogementId(etudiantId, logementId);
    }

    @Transactional(readOnly = true)
    public List<LogementDTO> getFavoriteLogements(Long etudiantId) {
        log.info("Récupération des logements favoris pour l'étudiant ID: {}", etudiantId);
        Etudiant etudiant = findEtudiant(etudiantId);
        List<Subscription> favoriteSubscriptions = subscriptionRepository.findByEtudiantIdAndLogementIsNotNull(etudiantId);
        log.debug("{} abonnements de type logement trouvés pour l'étudiant ID: {}", favoriteSubscriptions.size(), etudiantId);

        return favoriteSubscriptions.stream()
                .map(Subscription::getLogement)
                .filter(Objects::nonNull)
                .map(logementService::convertToDtoWithDetails)
                .collect(Collectors.toList());
    }

    private Etudiant findEtudiant(Long id) {
        return etudiantRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Étudiant non trouvé avec ID: {}", id);
                    return new NoSuchElementException("Étudiant non trouvé : ID " + id);
                });
    }

    private Proprietaire findProprietaire(Long id) {
        return proprietaireRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Propriétaire non trouvé avec ID: {}", id);
                    return new NoSuchElementException("Propriétaire non trouvé : ID " + id);
                });
    }

    private Logement findLogement(Long id) {
        return logementRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Logement non trouvé avec ID: {}", id);
                    return new NoSuchElementException("Logement non trouvé : ID " + id);
                });
    }
}
