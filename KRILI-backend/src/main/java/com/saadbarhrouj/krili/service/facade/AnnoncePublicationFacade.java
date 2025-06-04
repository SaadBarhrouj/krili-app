package com.saadbarhrouj.krili.service.facade;

import com.saadbarhrouj.krili.dto.AnnonceCreationDTO;
import com.saadbarhrouj.krili.model.Logement;
import com.saadbarhrouj.krili.model.Proprietaire;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface AnnoncePublicationFacade {

    Logement creerOuMettreAJourAnnonce(AnnonceCreationDTO dto,
                                       Proprietaire proprietaire,
                                       List<MultipartFile> images);

    Logement mettreAJourAnnonce(Long logementId,
                                AnnonceCreationDTO dto,
                                Proprietaire proprietaireConnecte,
                                List<MultipartFile> images);
}
