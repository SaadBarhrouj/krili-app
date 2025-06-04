package com.saadbarhrouj.krili.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ReservationListDTO {
    private Long id;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private LocalDateTime createdAt;
    private String messageEtudiant;
    private String messageProprietaire;
    private LogementSummaryDTO logement;
    private UtilisateurSummaryDTO proprietaire;
    private UtilisateurSummaryDTO etudiant;
}