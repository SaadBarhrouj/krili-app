package com.saadbarhrouj.krili.service;

import com.saadbarhrouj.krili.dto.LogementDTO;
import com.saadbarhrouj.krili.dto.ProprietaireDetailsDTO;
import com.saadbarhrouj.krili.model.Logement;
import com.saadbarhrouj.krili.model.Proprietaire;
import com.saadbarhrouj.krili.model.StatutAnnonce; // Import nécessaire
import com.saadbarhrouj.krili.repository.LogementRepository;
import com.saadbarhrouj.krili.repository.ProprietaireRepository;
import com.saadbarhrouj.krili.repository.ReviewRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
public class ProprietaireService {

    private static final Logger log = LoggerFactory.getLogger(ProprietaireService.class);

    private final ProprietaireRepository proprietaireRepository;
    private final LogementRepository logementRepository;
    private final LogementService logementService;
    private final ReviewRepository reviewRepository;

    @Autowired
    public ProprietaireService(
            ProprietaireRepository proprietaireRepository,
            LogementRepository logementRepository,
            LogementService logementService,
            ReviewRepository reviewRepository) {
        this.proprietaireRepository = proprietaireRepository;
        this.logementRepository = logementRepository;
        this.logementService = logementService;
        this.reviewRepository = reviewRepository;
    }

    @Transactional(readOnly = true)
    public ProprietaireDetailsDTO getProprietaireDetailsById(Long id) {
        log.info("SERVICE: Récupération détails pour propriétaire ID: {}", id);

        Proprietaire proprietaire = proprietaireRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("SERVICE: Propriétaire non trouvé avec ID: {}", id);
                    return new NoSuchElementException("Propriétaire non trouvé avec ID: " + id);
                });

        List<Logement> logementsActifsDuProprio = logementRepository.findByProprietaireId(id)
                .stream()
                .filter(logement -> logement.getStatut() == StatutAnnonce.ACTIVE) // Utilisation de l'enum importé
                .collect(Collectors.toList());
        log.debug("SERVICE: {} logements actifs trouvés pour propriétaire ID: {}", logementsActifsDuProprio.size(), id);

        List<LogementDTO> logementDTOs = logementsActifsDuProprio.stream()
                .map(logementService::convertToDtoWithDetails)
                .collect(Collectors.toList());

        BigDecimal avgRatingProprio = reviewRepository.calculateAverageRatingForProprietaire(proprietaire.getId())
                .map(avg -> avg.setScale(2, RoundingMode.HALF_UP))
                .orElse(BigDecimal.ZERO);
        long reviewCountProprio = reviewRepository.countReviewsForProprietaire(proprietaire.getId());
        log.debug("SERVICE: Stats avis pour propriétaire ID {}: Note Moyenne = {}, Nb Avis = {}", id, avgRatingProprio, reviewCountProprio);

        ProprietaireDetailsDTO detailsDTO = new ProprietaireDetailsDTO();
        detailsDTO.setId(proprietaire.getId());
        detailsDTO.setNom(proprietaire.getNom());
        detailsDTO.setEmail(proprietaire.getEmail());
        detailsDTO.setTelephone(proprietaire.getTelephone());
        detailsDTO.setNomAgence(proprietaire.getNomAgence());
        detailsDTO.setLogements(logementDTOs);
        detailsDTO.setAvatarId(proprietaire.getAvatar());
        detailsDTO.setAvgRating(avgRatingProprio);
        detailsDTO.setReviewCount((int) reviewCountProprio);

        log.info("SERVICE: Détails propriétaire ID {} préparés.", id);
        return detailsDTO;
    }
}