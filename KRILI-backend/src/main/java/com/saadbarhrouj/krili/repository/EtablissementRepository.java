package com.saadbarhrouj.krili.repository;

import com.saadbarhrouj.krili.model.Etablissement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EtablissementRepository extends JpaRepository<Etablissement, Long> {
    List<Etablissement> findByVilleId(Long villeId);
    List<Etablissement> findByVilleNom(String villeNom);
    Optional<Etablissement> findByNom(String nom);

}