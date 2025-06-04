package com.saadbarhrouj.krili.model.state;

import com.saadbarhrouj.krili.model.Logement;
import com.saadbarhrouj.krili.model.StatutAnnonce;


public class ArchivedState implements AnnonceState {

    @Override
    public void publier(Logement logement) {
        System.out.println("[STATE] Action: Publication depuis ARCHIVEE (équivaut à remettreEnLigne).");
        this.remettreEnLigne(logement);
    }

    @Override
    public void reserver(Logement logement) {
        System.err.println("[STATE] Action invalide: Annonce archivée, remettre en ligne d'abord.");
    }

    @Override
    public void confirmerLocation(Logement logement) {
        System.err.println("[STATE] Action invalide: Annonce archivée.");
    }

    @Override
    public void archiver(Logement logement) {
        System.out.println("[STATE] Action: Déjà archivé.");
    }

    @Override
    public void remettreEnLigne(Logement logement) {
        System.out.println("[STATE] Transition: ARCHIVEE -> ACTIVE");
        logement.setInternalState(new ActiveState());
        // logement.setStatut(StatutAnnonce.ACTIVE);
    }

    @Override
    public void passerEnBrouillon(Logement logement) {
        System.out.println("[STATE] Transition: ARCHIVEE -> BROUILLON");
        logement.setInternalState(new DraftState());
        // logement.setStatut(StatutAnnonce.BROUILLON);
    }

    @Override
    public StatutAnnonce getStatutAssocie() {
        return StatutAnnonce.ARCHIVEE;
    }
}