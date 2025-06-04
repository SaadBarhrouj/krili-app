package com.saadbarhrouj.krili.model.state;

import com.saadbarhrouj.krili.model.Logement;
import com.saadbarhrouj.krili.model.StatutAnnonce;

public class ReservedState implements AnnonceState {

    @Override
    public void publier(Logement logement) {
        System.err.println("[STATE] Action invalide: Annuler la réservation d'abord (remettreEnLigne).");
    }

    @Override
    public void reserver(Logement logement) {
        System.out.println("[STATE] Action: Déjà réservé.");
    }

    @Override
    public void confirmerLocation(Logement logement) {
        System.out.println("[STATE] Transition: RESERVEE -> LOUEE");
        logement.setInternalState(new RentedState());
        // logement.setStatut(StatutAnnonce.LOUEE);
    }

    @Override
    public void archiver(Logement logement) {
        System.out.println("[STATE] Transition: RESERVEE -> ARCHIVEE (Annulation réservation)");
        logement.setInternalState(new ArchivedState());
        // logement.setStatut(StatutAnnonce.ARCHIVEE);
    }

    @Override
    public void remettreEnLigne(Logement logement) {
        System.out.println("[STATE] Transition: RESERVEE -> ACTIVE (Annulation réservation)");
        logement.setInternalState(new ActiveState());
        // logement.setStatut(StatutAnnonce.ACTIVE);
    }

    @Override
    public void passerEnBrouillon(Logement logement) {
        System.err.println("[STATE] Action invalide: Annuler la réservation d'abord (archiver ou remettreEnLigne).");
    }

    @Override
    public StatutAnnonce getStatutAssocie() {
        return StatutAnnonce.RESERVEE;
    }
}