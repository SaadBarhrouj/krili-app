package com.saadbarhrouj.krili.dto;

public class LoginRequest {
    private String email;
    private String password;

    public LoginRequest() {
    }

    // Constructeur avec arguments (optionnel mais pratique)
    public LoginRequest(String email, String password) {
        this.email = email;
        this.password = password;
    }

    // Getter pour email
    public String getEmail() {
        return email;
    }

    // Setter pour email
    public void setEmail(String email) {
        this.email = email;
    }

    // Getter pour password
    public String getPassword() {
        return password;
    }

    // Setter pour password
    public void setPassword(String password) {
        this.password = password;
    }

    // toString (utile pour le débogage, optionnel)
    @Override
    public String toString() {
        return "LoginRequest{" +
                "email='" + email + '\'' +
                // Ne pas inclure le mot de passe dans toString pour la sécurité
                ", password='[PROTECTED]'" +
                '}';
    }

}