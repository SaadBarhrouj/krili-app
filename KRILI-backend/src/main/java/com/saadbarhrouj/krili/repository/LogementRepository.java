package com.saadbarhrouj.krili.repository;

import com.saadbarhrouj.krili.model.Logement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository; // Bonne pratique d'ajouter @Repository même si optionnel pour JpaRepository
import java.util.List; // Importer List si vous ajoutez d'autres méthodes qui retournent des listes
import java.util.Optional;

@Repository
public interface LogementRepository extends JpaRepository<Logement, Long> {

    Optional<Logement> findByIdAndProprietaireId(Long logementId, Long proprietaireId);

    boolean existsByIdAndProprietaireId(Long logementId, Long proprietaireId);

     List<Logement> findByProprietaireId(Long proprietaireId);

    long countByProprietaireId(Long proprietaireId);

}