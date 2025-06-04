package com.saadbarhrouj.krili.service;

import com.saadbarhrouj.krili.model.Utilisateur;
import com.saadbarhrouj.krili.repository.UtilisateurRepository;
// PAS BESOIN d'importer org.springframework.security.core.userdetails.User ici
import org.slf4j.Logger; // Importer Logger
import org.slf4j.LoggerFactory; // Importer LoggerFactory
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UtilisateurRepository utilisateurRepository;
    private static final Logger log = LoggerFactory.getLogger(CustomUserDetailsService.class); // Logger

    public CustomUserDetailsService(UtilisateurRepository utilisateurRepository) {
        this.utilisateurRepository = utilisateurRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        log.debug("Tentative de chargement de l'utilisateur avec email : {}", email);
        // 1. Rechercher l'utilisateur COMPLET dans la base de données par son email
        Utilisateur utilisateur = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Utilisateur non trouvé avec l'email : {}", email);
                    return new UsernameNotFoundException("Utilisateur non trouvé avec l'email : " + email);
                });

        // --- CORRECTION ICI ---

        log.info("Utilisateur trouvé : {} (Nom: {}, Avatar: {}, Roles: {})",
                utilisateur.getEmail(),
                utilisateur.getNom(),
                utilisateur.getAvatar(),
                utilisateur.getAuthorities());
        return utilisateur;
        // --- FIN CORRECTION ---

    }
}