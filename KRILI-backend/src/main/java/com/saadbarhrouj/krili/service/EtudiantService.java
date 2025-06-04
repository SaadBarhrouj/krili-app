// KRILI-backend\src\main\java\com\saadbarhrouj\krili\service\EtudiantService.java
package com.saadbarhrouj.krili.service;

import com.saadbarhrouj.krili.dto.EtudiantPublicProfilDTO;
import com.saadbarhrouj.krili.model.Etudiant;
import com.saadbarhrouj.krili.repository.EtudiantRepository;
import com.saadbarhrouj.krili.repository.ReviewRepository; // Gardé si utilisé ailleurs
import com.saadbarhrouj.krili.repository.UtilisateurRepository;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils; // Pour hasText
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.RoundingMode;
import java.util.List;

@Service
public class EtudiantService {

    private static final Logger log = LoggerFactory.getLogger(EtudiantService.class);

    private final EtudiantRepository etudiantRepository;
    private final ReviewRepository reviewRepository; // Gardé si d'autres méthodes l'utilisent
    private final UtilisateurRepository utilisateurRepository; // Pour sauvegarder
    private final ImageStorageService imageStorageService; // Pour l'avatar

    @Autowired
    public EtudiantService(EtudiantRepository etudiantRepository,
                           ReviewRepository reviewRepository,
                           UtilisateurRepository utilisateurRepository,
                           ImageStorageService imageStorageService) {
        this.etudiantRepository = etudiantRepository;
        this.reviewRepository = reviewRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.imageStorageService = imageStorageService;
    }

    @Transactional(readOnly = true)
    public EtudiantPublicProfilDTO getEtudiantPublicProfilById(Long etudiantId) {
        // ... (code existant)
        Etudiant etudiant = etudiantRepository.findById(etudiantId)
                .orElseThrow(() -> new EntityNotFoundException("Profil étudiant non trouvé avec ID: " + etudiantId));

        EtudiantPublicProfilDTO dto = new EtudiantPublicProfilDTO();
        dto.setId(etudiant.getId());
        dto.setNom(etudiant.getNom());
        dto.setAvatar(etudiant.getAvatar());
        dto.setEtablissement(etudiant.getEtablissement());
        dto.setFiliere(etudiant.getFiliere());
        dto.setAnneeEtude(etudiant.getAnneeEtude());
        dto.setVilleEtude(etudiant.getVilleEtude());
        dto.setAvgRatingFromProprietaires(
                etudiant.getAvgRating() != null ? etudiant.getAvgRating().setScale(1, RoundingMode.HALF_UP) : null
        );
        dto.setReviewCountFromProprietaires(etudiant.getReviewCount());

        return dto;
    }

    /**
     * Met à jour le profil d'un étudiant.
     *
     * @param etudiantId        L'ID de l'étudiant à mettre à jour.
     * @param nom               Nouveau nom (peut être null si non modifié).
     * @param telephone         Nouveau téléphone (peut être null si non modifié).
     * @param villeEtude        Nouvelle ville d'étude (peut être null si non modifié).
     * @param etablissement     Nouvel établissement (peut être null si non modifié).
     * @param filiere           Nouvelle filière (peut être null si non modifié).
     * @param anneeEtude        Nouvelle année d'étude (peut être null si non modifié).
     * @param photoProfilFile   Nouveau fichier d'avatar (peut être null).
     * @return L'entité Etudiant mise à jour.
     * @throws EntityNotFoundException Si l'étudiant n'est pas trouvé.
     * @throws IOException             Si une erreur survient lors du stockage de l'avatar.
     */
    @Transactional
    public Etudiant updateEtudiantProfile(Long etudiantId,
                                          String nom,
                                          String telephone,
                                          String villeEtude,
                                          String etablissement,
                                          String filiere,
                                          Integer anneeEtude,
                                          MultipartFile photoProfilFile) throws IOException {

        log.info("SERVICE: Mise à jour du profil pour l'étudiant ID: {}", etudiantId);
        Etudiant etudiant = etudiantRepository.findById(etudiantId)
                .orElseThrow(() -> {
                    log.error("SERVICE: Étudiant non trouvé pour mise à jour avec ID: {}", etudiantId);
                    return new EntityNotFoundException("Étudiant non trouvé avec ID: " + etudiantId);
                });

        boolean isModified = false;
        String oldAvatarId = etudiant.getAvatar(); // Sauvegarder l'ancien ID pour suppression éventuelle

        if (StringUtils.hasText(nom) && !nom.equals(etudiant.getNom())) {
            etudiant.setNom(nom.trim());
            isModified = true;
            log.debug("SERVICE: Nom mis à jour pour étudiant ID {}", etudiantId);
        }
        if (telephone != null && !telephone.equals(etudiant.getTelephone())) { // Le téléphone peut être une chaîne vide pour le supprimer
            etudiant.setTelephone(telephone.trim());
            isModified = true;
            log.debug("SERVICE: Téléphone mis à jour pour étudiant ID {}", etudiantId);
        }
        if (StringUtils.hasText(villeEtude) && !villeEtude.equals(etudiant.getVilleEtude())) {
            etudiant.setVilleEtude(villeEtude.trim());
            isModified = true;
            log.debug("SERVICE: Ville d'étude mise à jour pour étudiant ID {}", etudiantId);
        }
        if (StringUtils.hasText(etablissement) && !etablissement.equals(etudiant.getEtablissement())) {
            etudiant.setEtablissement(etablissement.trim());
            isModified = true;
            log.debug("SERVICE: Établissement mis à jour pour étudiant ID {}", etudiantId);
        }
        if (StringUtils.hasText(filiere) && !filiere.equals(etudiant.getFiliere())) {
            etudiant.setFiliere(filiere.trim());
            isModified = true;
            log.debug("SERVICE: Filière mise à jour pour étudiant ID {}", etudiantId);
        }
        if (anneeEtude != null && anneeEtude > 0 && anneeEtude != etudiant.getAnneeEtude()) {
            etudiant.setAnneeEtude(anneeEtude);
            isModified = true;
            log.debug("SERVICE: Année d'étude mise à jour pour étudiant ID {}", etudiantId);
        }

        String newAvatarDbIdentifier = null;
        if (photoProfilFile != null && !photoProfilFile.isEmpty()) {
            log.debug("SERVICE: Traitement du nouvel avatar pour étudiant ID {}", etudiantId);
            // TODO: Implémenter la suppression de l'ancien avatar dans ImageStorageService
            // if (oldAvatarId != null) {
            // imageStorageService.deleteImage(oldAvatarId); // Supposer que cette méthode existe
            // }
            List<String> identifiers = imageStorageService.storeImages(List.of(photoProfilFile), etudiant.getId());
            if (!identifiers.isEmpty()) {
                newAvatarDbIdentifier = identifiers.get(0);
                etudiant.setAvatar(newAvatarDbIdentifier); // Le `newAvatarId` renvoyé par le contrôleur viendra de là
                isModified = true;
                log.info("SERVICE: Nouvel avatar sauvegardé ({}) pour étudiant ID {}", newAvatarDbIdentifier, etudiantId);
            }
        }

        if (isModified) {
            Etudiant updatedEtudiant = utilisateurRepository.save(etudiant); // Sauvegarde via le repo de la classe concrète ou UtilisateurRepository
            log.info("SERVICE: Profil étudiant ID {} sauvegardé avec succès.", updatedEtudiant.getId());
            return updatedEtudiant;
        } else {
            log.info("SERVICE: Aucune modification détectée pour le profil étudiant ID {}.", etudiantId);
            return etudiant; // Retourner l'entité originale si pas de modif
        }
    }
}