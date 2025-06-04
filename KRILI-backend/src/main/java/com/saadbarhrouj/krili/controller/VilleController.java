package com.saadbarhrouj.krili.controller;

import com.saadbarhrouj.krili.model.Ville;
import com.saadbarhrouj.krili.repository.VilleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/villes")
public class VilleController {

    private static final Logger log = LoggerFactory.getLogger(VilleController.class);
    private final VilleRepository villeRepository;

    @Autowired
    public VilleController(VilleRepository villeRepository) {
        this.villeRepository = villeRepository;
    }

    @GetMapping
    public ResponseEntity<List<Ville>> getAllVilles() {
        log.info("Requête GET pour récupérer toutes les villes");
        List<Ville> villes = villeRepository.findAll();
        if (villes.isEmpty()) {
            log.info("Aucune ville trouvée");
            return ResponseEntity.noContent().build();
        }
        log.info("{} villes récupérées", villes.size());
        return ResponseEntity.ok(villes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ville> getVilleById(@PathVariable Long id) {
        log.info("Requête GET pour récupérer la ville avec ID: {}", id);
        return villeRepository.findById(id)
                .map(ville -> {
                    log.info("Ville trouvée: {}", ville.getNom());
                    return ResponseEntity.ok(ville);
                })
                .orElseGet(() -> {
                    log.warn("Ville non trouvée pour ID: {}", id);
                    return ResponseEntity.notFound().build();
                });
    }
}