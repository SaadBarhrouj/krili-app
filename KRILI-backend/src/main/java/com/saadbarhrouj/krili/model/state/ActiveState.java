package com.saadbarhrouj.krili.model.state;

import com.saadbarhrouj.krili.model.Logement;
import com.saadbarhrouj.krili.model.StatutAnnonce;

/** État: Active / Publiée */
public class ActiveState implements AnnonceState {

    @Override
    public void publier(Logement logement) {
        System.out.println("[STATE] Action: Déjà actif.");
    }

    @Override
    public void reserver(Logement logement) {
        System.out.println("[STATE] Transition: ACTIVE -> RESERVEE");
        logement.setInternalState(new ReservedState()); // <-- Appel corrigé
    }

    @Override
    public void confirmerLocation(Logement logement) {
        System.err.println("[STATE] Action invalide: Il faut d'abord réserver.");
    }

    @Override
    public void archiver(Logement logement) {
        System.out.println("[STATE] Transition: ACTIVE -> ARCHIVEE");
        logement.setInternalState(new ArchivedState()); // <-- Appel corrigé
    }

    @Override
    public void remettreEnLigne(Logement logement) {
        System.out.println("[STATE] Action: Déjà en ligne.");
    }

    @Override
    public void passerEnBrouillon(Logement logement) {
        System.out.println("[STATE] Transition: ACTIVE -> BROUILLON");
        logement.setInternalState(new DraftState()); // <-- Appel corrigé
    }

    @Override
    public StatutAnnonce getStatutAssocie() {
        return StatutAnnonce.ACTIVE;
    }
}