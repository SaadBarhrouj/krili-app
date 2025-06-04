// =================================
// FICHIER: src/main/java/com/saadbarhrouj/krili/decorator/TopListingDecorator.java
// =================================
package com.saadbarhrouj.krili.decorator;

// Décorateur concret pour booster la visibilité dans les recherches
public class TopListingDecorator extends AnnonceDecorator {

    private int boostAmount;

    public TopListingDecorator(AnnonceComponent annonce, int boostAmount) {
        super(annonce);
        this.boostAmount = boostAmount;
    }

    @Override
    public int getSearchBoostScore() {
        // Ajoute un boost au score du composant décoré
        return super.getSearchBoostScore() + this.boostAmount;
    }
}