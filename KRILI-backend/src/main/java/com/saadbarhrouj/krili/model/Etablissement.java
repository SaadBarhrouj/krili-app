package com.saadbarhrouj.krili.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.HashSet;
import java.util.Set;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Etablissement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String nom;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ville_id", nullable = false)
    private Ville ville;

    @Column(length = 100)
    private String typeEtablissement;


    @ManyToMany(mappedBy = "etablissementsProches", fetch = FetchType.LAZY)
    private Set<Logement> logements = new HashSet<>();


    public Etablissement(String nom, Ville ville) {
        this.nom = nom;
        this.ville = ville;
    }
    public Etablissement(String nom, Ville ville, String typeEtablissement) {
        this.nom = nom;
        this.ville = ville;
        this.typeEtablissement = typeEtablissement;
    }
}