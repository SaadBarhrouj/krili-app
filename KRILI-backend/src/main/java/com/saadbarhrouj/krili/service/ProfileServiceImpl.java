package com.saadbarhrouj.krili.service;

import com.saadbarhrouj.krili.dto.ProfilProprietaireDTO;
import com.saadbarhrouj.krili.model.Proprietaire;
import com.saadbarhrouj.krili.repository.ProprietaireRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.NoSuchElementException;

@Service
public class ProfileServiceImpl implements ProfileService {

    private static final Logger log = LoggerFactory.getLogger(ProfileServiceImpl.class);

    @Autowired
    private ProprietaireRepository proprietaireRepository;

    @Autowired
    private SubscriptionService subscriptionService;

    @Override
    @Transactional(readOnly = true)
    public ProfilProprietaireDTO getProprietaireProfileByEmail(String email) {
        log.info("Récupération du profil pour l'email : {}", email);

        Proprietaire proprietaire = proprietaireRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Aucun propriétaire trouvé pour l'email: {}", email);
                    return new NoSuchElementException("Propriétaire non trouvé pour l'email: " + email);
                });

        long nbAbonnes = subscriptionService.countAbonnesByProprietaireId(proprietaire.getId());
        log.debug("Nombre d'abonnés pour propriétaire ID {}: {}", proprietaire.getId(), nbAbonnes);

        ProfilProprietaireDTO dto = new ProfilProprietaireDTO();
        dto.setId(proprietaire.getId());
        dto.setEmail(proprietaire.getEmail());
        dto.setNom(proprietaire.getNom());
        dto.setTelephone(proprietaire.getTelephone());
        dto.setAvatar(proprietaire.getAvatar());
        dto.setStatut(proprietaire.getStatut());
        dto.setNomAgence(proprietaire.getNomAgence());
        dto.setNombreAbonnes(nbAbonnes);
        dto.setSiret(proprietaire.getSiret());

        log.info("Profil DTO préparé pour {}", email);
        return dto;
    }

    @Override
    @Transactional
    public void updateProprietaireProfile(Long userId, ProfilProprietaireDTO updateData, String newAvatarId) {
        log.info("Tentative de mise à jour du profil pour l'utilisateur ID: {}", userId);

        Proprietaire proprietaire = proprietaireRepository.findById(userId)
                .orElseThrow(() -> {
                    log.error("Propriétaire non trouvé pour la mise à jour avec ID: {}", userId);
                    return new NoSuchElementException("Propriétaire à mettre à jour non trouvé avec ID: " + userId);
                });

        boolean needsSave = false;

        if (updateData.getNom() != null && StringUtils.hasText(updateData.getNom()) && !updateData.getNom().equals(proprietaire.getNom())) {
            log.debug("Mise à jour Nom pour ID {}: '{}' -> '{}'", userId, proprietaire.getNom(), updateData.getNom());
            proprietaire.setNom(updateData.getNom().trim());
            needsSave = true;
        }
        if (updateData.getTelephone() != null && StringUtils.hasText(updateData.getTelephone()) && !updateData.getTelephone().equals(proprietaire.getTelephone())) {
            log.debug("Mise à jour Téléphone pour ID {}: '{}' -> '{}'", userId, proprietaire.getTelephone(), updateData.getTelephone());
            proprietaire.setTelephone(updateData.getTelephone().trim());
            needsSave = true;
        }

        if (newAvatarId != null) {
            String oldAvatar = proprietaire.getAvatar();
            if (!newAvatarId.equals(oldAvatar)) {
                log.debug("Mise à jour Avatar pour ID {}: '{}' -> '{}'", userId, oldAvatar, newAvatarId);
                proprietaire.setAvatar(newAvatarId);
                needsSave = true;
            }
        }

        if (needsSave) {
            proprietaireRepository.save(proprietaire);
            log.info("Profil propriétaire ID {} mis à jour et sauvegardé.", userId);
        } else {
            log.info("Aucune modification à sauvegarder pour le profil propriétaire ID {}.", userId);
        }
    }
}
