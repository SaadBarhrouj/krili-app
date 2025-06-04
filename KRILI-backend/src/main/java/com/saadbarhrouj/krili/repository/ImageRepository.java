package com.saadbarhrouj.krili.repository;
import com.saadbarhrouj.krili.model.Image;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ImageRepository extends JpaRepository<Image, Long> {
    List<Image> findByLogementId(Long logementId);
}