package com.saadbarhrouj.krili.repository;

import com.saadbarhrouj.krili.model.Etudiant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EtudiantRepository extends JpaRepository<Etudiant, Long> {
    Optional<Etudiant> findByEmail(String email);
    boolean existsByEmail(String email);
}
