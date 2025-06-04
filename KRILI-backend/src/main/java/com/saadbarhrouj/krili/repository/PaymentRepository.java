
package com.saadbarhrouj.krili.repository;
import com.saadbarhrouj.krili.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByTransactionId(String transactionId);
    List<Payment> findByPayerId(Long userId);
    List<Payment> findByLogementId(Long logementId);
    Optional<Payment> findByReservationId(Long reservationId);
}

