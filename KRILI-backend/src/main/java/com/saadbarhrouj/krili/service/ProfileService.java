package com.saadbarhrouj.krili.service;
import com.saadbarhrouj.krili.dto.ProfilProprietaireDTO;

public interface ProfileService {
    ProfilProprietaireDTO getProprietaireProfileByEmail(String email);
    void updateProprietaireProfile(Long userId, ProfilProprietaireDTO updateData, String newAvatarId);

}