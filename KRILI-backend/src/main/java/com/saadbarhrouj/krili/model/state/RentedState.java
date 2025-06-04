package com.saadbarhrouj.krili.model.state;

import com.saadbarhrouj.krili.model.Logement;
import com.saadbarhrouj.krili.model.StatutAnnonce;

/** État: Louée */
public class RentedState implements AnnonceState {

    @Override
    public void publier(Logement logement) {
        System.err.println("[STATE] Action invalide: Logement actuellement loué.");
    }

    @Override
    public void reserver(Logement logement) {
        System.err.println("[STATE] Action invalide: Logement actuellement loué.");
    }

    @Override
    public void confirmerLocation(Logement logement) {
        System.out.println("[STATE] Action: Déjà loué.");
    }

    @Override
    public void archiver(Logement logement) {
        System.out.println("[STATE] Transition: LOUEE -> ARCHIVEE");
        logement.setInternalState(new ArchivedState());
        // logement.setStatut(StatutAnnonce.ARCHIVEE);
    }

    @Override
    public void remettreEnLigne(Logement logement) {
        System.out.println("[STATE] Transition: LOUEE -> ACTIVE (Fin de location)");
        // Logique métier: peut-être vérifier la date de fin de bail ?
        logement.setInternalState(new ActiveState());
        // logement.setStatut(StatutAnnonce.ACTIVE);
    }

    @Override
    public void passerEnBrouillon(Logement logement) {
        System.err.println("[STATE] Action invalide: Logement loué, archiver d'abord.");
    }

    @Override
    public StatutAnnonce getStatutAssocie() {
        return StatutAnnonce.LOUEE;
    }
}