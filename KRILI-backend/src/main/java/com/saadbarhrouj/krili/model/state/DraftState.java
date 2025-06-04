package com.saadbarhrouj.krili.model.state;

import com.saadbarhrouj.krili.model.Logement;
import com.saadbarhrouj.krili.model.StatutAnnonce;

/** État: Brouillon */
public class DraftState implements AnnonceState {

    @Override
    public void publier(Logement logement) {
        System.out.println("[STATE] Transition: BROUILLON -> ACTIVE");
        logement.setInternalState(new ActiveState());
    }

    @Override
    public void reserver(Logement logement) {
        System.err.println("[STATE] Action invalide: Impossible de réserver un brouillon.");
    }

    @Override
    public void confirmerLocation(Logement logement) {
        System.err.println("[STATE] Action invalide: Impossible de confirmer la location d'un brouillon.");
    }

    @Override
    public void archiver(Logement logement) {
        System.out.println("[STATE] Transition: BROUILLON -> ARCHIVEE");
        logement.setInternalState(new ArchivedState());
    }

    @Override
    public void remettreEnLigne(Logement logement) {
        System.out.println("[STATE] Action: Remettre en ligne depuis BROUILLON (Publication)");
        this.publier(logement);
    }

    @Override
    public void passerEnBrouillon(Logement logement) {
        System.out.println("[STATE] Action: Déjà en brouillon.");
    }

    @Override
    public StatutAnnonce getStatutAssocie() {
        return StatutAnnonce.BROUILLON;
    }
}