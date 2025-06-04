package com.saadbarhrouj.krili.decorator;

import com.saadbarhrouj.krili.model.Logement; // Ou un DTO si on décore un DTO

import java.util.List;

// Interface de base pour un composant "Annonce" affichable
// Les méthodes représentent les informations qu'on veut pouvoir obtenir/modifier
public interface AnnonceComponent {
    // Méthode pour obtenir les données brutes du logement (ou un DTO simplifié)
    Logement getLogementData();

    // Exemple: obtenir une description formatée pour l'affichage
    String getFormattedDescription();

    // Exemple: obtenir le prix formaté
    String getFormattedPrice();

    // Exemple: obtenir des "badges" ou marqueurs visuels
    List<String> getDisplayBadges();

    // Exemple: obtenir un score de mise en avant pour le tri
    int getSearchBoostScore();

    // ... autres méthodes utiles pour l'affichage/traitement ...
}