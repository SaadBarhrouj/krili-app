package com.saadbarhrouj.krili.model;

import jakarta.persistence.*;
import java.util.Objects;
import jakarta.persistence.Entity;

@Entity
public class Ville {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String nom;

    @Column(length = 100)
    private String region;

    public Ville() {
    }

    public Ville(String nom, String region) {
        this.nom = nom;
        this.region = region;
    }
    public Ville(String nom) {
        this.nom = nom;
    }


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    // 4. equals() et hashCode() (basés sur l'ID si non nul, sinon sur les champs métier)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Ville ville = (Ville) o;
        if (id != null && ville.id != null) {
            return Objects.equals(id, ville.id);
        }
        return Objects.equals(nom, ville.nom) && Objects.equals(region, ville.region);
    }

    @Override
    public int hashCode() {
        if (id != null) {
            return Objects.hash(id);
        }
        return Objects.hash(nom, region);
    }

    // 5. toString() (optionnel, pour débogage)
    @Override
    public String toString() {
        return "Ville{" +
                "id=" + id +
                ", nom='" + nom + '\'' +
                ", region='" + region + '\'' +
                '}';
    }
}