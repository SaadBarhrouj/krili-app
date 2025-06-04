package com.saadbarhrouj.krili.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDate;

@Data // Lombok pour getters, setters, toString, etc.
public class DemandeReservationDTO {

    @NotNull(message = "L'ID du logement est requis.")
    private Long logementId;

    @NotNull(message = "La date de d??but est requise.")
    @FutureOrPresent(message = "La date de d??but ne peut pas ??tre dans le pass??.")
    private LocalDate dateDebut;

    @NotNull(message = "La date de fin est requise.")
    @Future(message = "La date de fin doit ??tre dans le futur.")
    private LocalDate dateFin;

    @Size(max = 500, message = "Le message ne doit pas d??passer 500 caract??res.")
    private String message;

}