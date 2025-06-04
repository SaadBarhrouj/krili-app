package com.saadbarhrouj.krili.model.state;

import com.saadbarhrouj.krili.model.Logement;
import com.saadbarhrouj.krili.model.StatutAnnonce; // Importer l'enum


public interface AnnonceState {

    void publier(Logement logement);
    void reserver(Logement logement);
    void confirmerLocation(Logement logement);
    void archiver(Logement logement);
    void remettreEnLigne(Logement logement);
    void passerEnBrouillon(Logement logement);

    StatutAnnonce getStatutAssocie();

}