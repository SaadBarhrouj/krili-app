package com.saadbarhrouj.krili.repository;

import com.saadbarhrouj.krili.model.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByEtudiantIdOrderByStartDateDesc(Long etudiantId);
    List<Reservation> findByProprietaireIdOrderByStartDateDesc(Long proprietaireId);
    List<Reservation> findByLogementIdOrderByStartDateDesc(Long logementId);

    @Query("SELECT r FROM Reservation r WHERE r.logement.id = :logementId " +
            "AND r.status NOT IN (com.saadbarhrouj.krili.model.Reservation.ReservationStatus.CANCELED_BY_ETUDIANT, com.saadbarhrouj.krili.model.Reservation.ReservationStatus.CANCELED_BY_PROPRIETAIRE) " +
            "AND r.startDate < :endDate AND r.endDate > :startDate")
    List<Reservation> findOverlappingReservations(@Param("logementId") Long logementId,
                                                  @Param("startDate") LocalDate startDate,
                                                  @Param("endDate") LocalDate endDate);

    @Query("SELECT r FROM Reservation r WHERE r.logement.id = :logementId " +
            "AND r.status IN (com.saadbarhrouj.krili.model.Reservation.ReservationStatus.CONFIRMED, com.saadbarhrouj.krili.model.Reservation.ReservationStatus.ONGOING) " +
            "AND (r.startDate < :endDate AND r.endDate > :startDate)") // Vérifie le chevauchement
    List<Reservation> findUnavailableOverlappingReservations( // Nommer plus spécifiquement
                                                              @Param("logementId") Long logementId,
                                                              @Param("startDate") LocalDate startDate,
                                                              @Param("endDate") LocalDate endDate
    );

    Optional<Reservation> findTopByLogementIdAndStatusInOrderByEndDateDesc(Long logementId, List<Reservation.ReservationStatus> statuses);
    List<Reservation> findByLogementIdAndStatus(Long logementId, Reservation.ReservationStatus status);
    List<Reservation> findByProprietaireIdAndStatusOrderByCreatedAtDesc(Long proprietaireId, Reservation.ReservationStatus status);
    long countByProprietaireIdAndStatus(Long proprietaireId, Reservation.ReservationStatus status);
    long countByEtudiantIdAndStatus(Long etudiantId, Reservation.ReservationStatus status);
    List<Reservation> findByEtudiantIdAndLogementId(Long etudiantId, Long logementId);
    List<Reservation> findByEtudiantIdAndLogementIdOrderByStartDateDesc(Long id, Long id1);

    @Query("SELECT r FROM Reservation r WHERE r.etudiant.id = :etudiantId AND r.logement.proprietaire.id = :proprietaireId ORDER BY r.startDate DESC")
    List<Reservation> findByEtudiantIdAndLogementProprietaireId(@Param("etudiantId") Long etudiantId, @Param("proprietaireId") Long proprietaireId);

    @Query("SELECT r FROM Reservation r WHERE r.logement.proprietaire.id = :proprietaireId AND r.etudiant.id = :etudiantId ORDER BY r.startDate DESC")


    List<Reservation> findByProprietaireIdAndEtudiantId(@Param("proprietaireId") Long proprietaireId, @Param("etudiantId") Long etudiantId);


    @Query("SELECT r FROM Reservation r WHERE r.logement.id = :logementId " +
            "AND r.status IN (com.saadbarhrouj.krili.model.Reservation.ReservationStatus.CONFIRMED, com.saadbarhrouj.krili.model.Reservation.ReservationStatus.ONGOING)")
    List<Reservation> findConfirmedAndOngoingReservationsForLogement(@Param("logementId") Long logementId);

    @Query("SELECT r FROM Reservation r WHERE r.logement.id = :logementId " +
            "AND r.etudiant.id = :etudiantId " +
            "AND r.status = com.saadbarhrouj.krili.model.Reservation.ReservationStatus.PENDING")
    List<Reservation> findPendingReservationsByLogementAndEtudiant(
            @Param("logementId") Long logementId,
            @Param("etudiantId") Long etudiantId
    );


    @Query("SELECT r FROM Reservation r WHERE r.logement.id = :logementId " +
            "AND r.etudiant.id = :etudiantId " +
            "AND r.status = com.saadbarhrouj.krili.model.Reservation.ReservationStatus.PENDING " +
            "AND ((r.startDate <= :endDate AND r.endDate >= :startDate))") // Vérifie le chevauchement
    List<Reservation> findExistingPendingRequestsForStudentOnDates(
            @Param("logementId") Long logementId,
            @Param("etudiantId") Long etudiantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

}

