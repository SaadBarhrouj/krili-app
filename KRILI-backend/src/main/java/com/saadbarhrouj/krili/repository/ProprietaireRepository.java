package com.saadbarhrouj.krili.repository;

import com.saadbarhrouj.krili.model.Proprietaire;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ProprietaireRepository extends JpaRepository<Proprietaire, Long> {
    Optional<Proprietaire> findByEmail(String email);

}