package com.saadbarhrouj.krili.builder;

import com.saadbarhrouj.krili.model.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

public interface ILogementBuilder {
    ILogementBuilder id(Long id);
    ILogementBuilder adresseLigne1(String val);
    ILogementBuilder codePostal(String val);
    ILogementBuilder ville(Ville val);
    ILogementBuilder latitude(Double val);
    ILogementBuilder longitude(Double val);
    ILogementBuilder type(TypeLogement val);
    ILogementBuilder description(String val);
    ILogementBuilder prix(Double val);
    ILogementBuilder surface(Double val);
    ILogementBuilder meuble(Boolean val);
    ILogementBuilder nombreDePieces(Integer val);
    ILogementBuilder addImage(Image image);
    ILogementBuilder equipements(List<String> val);
    ILogementBuilder etablissementsProches(Set<Etablissement> val);
    ILogementBuilder images(List<Image> val);
    ILogementBuilder statut(StatutAnnonce val);
    ILogementBuilder niveauPremium(NiveauPremium val);
    ILogementBuilder dateDisponibilite(LocalDate val);
    ILogementBuilder premiumStartDate(LocalDate val);
    ILogementBuilder premiumEndDate(LocalDate val);
    ILogementBuilder proprietaire(Proprietaire val);
    ILogementBuilder avgRating(BigDecimal val);
    ILogementBuilder reviewCount(Integer val);
    Logement build();
}
