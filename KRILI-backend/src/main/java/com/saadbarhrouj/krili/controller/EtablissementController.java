package com.saadbarhrouj.krili.controller;

import com.saadbarhrouj.krili.dto.EtablissementResponseDTO;
import com.saadbarhrouj.krili.model.Etablissement;
import com.saadbarhrouj.krili.repository.EtablissementRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/etablissements")
public class EtablissementController {

    private static final Logger log = LoggerFactory.getLogger(EtablissementController.class);
    private final EtablissementRepository etablissementRepository;

    @Autowired
    public EtablissementController(EtablissementRepository etablissementRepository) {
        this.etablissementRepository = etablissementRepository;
    }

    @GetMapping
    public ResponseEntity<List<EtablissementResponseDTO>> getEtablissementsByVille(
            @RequestParam(name = "villeId") Long villeId) {
        log.info("Requête GET pour récupérer les établissements de la ville ID: {}", villeId);
        List<Etablissement> etablissements = etablissementRepository.findByVilleId(villeId);
        if (etablissements.isEmpty()) {
            log.info("Aucun établissement trouvé pour la ville ID: {}", villeId);
        }
        List<EtablissementResponseDTO> dtos = etablissements.stream()
                .map(etab -> new EtablissementResponseDTO(etab.getId(), etab.getNom()))
                .collect(Collectors.toList());
        log.info("{} établissements récupérés pour la ville ID: {}", dtos.size(), villeId);
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/all")
    public ResponseEntity<List<EtablissementResponseDTO>> getAllEtablissements() {
        log.info("Requête GET pour récupérer tous les établissements");
        List<Etablissement> etablissements = etablissementRepository.findAll(Sort.by(Sort.Direction.ASC, "nom"));
        if (etablissements.isEmpty()) {
            log.info("Aucun établissement trouvé dans la base de données");
        }
        List<EtablissementResponseDTO> dtos = etablissements.stream()
                .map(etab -> new EtablissementResponseDTO(etab.getId(), etab.getNom()))
                .collect(Collectors.toList());
        log.info("{} établissements récupérés au total", dtos.size());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EtablissementResponseDTO> getEtablissementById(@PathVariable Long id) {
        log.info("Requête GET pour récupérer l'établissement avec ID: {}", id);
        return etablissementRepository.findById(id)
                .map(etab -> {
                    log.info("Établissement trouvé: {}", etab.getNom());
                    return ResponseEntity.ok(new EtablissementResponseDTO(etab.getId(), etab.getNom()));
                })
                .orElseGet(() -> {
                    log.warn("Établissement non trouvé pour ID: {}", id);
                    return ResponseEntity.notFound().build();
                });
    }
}