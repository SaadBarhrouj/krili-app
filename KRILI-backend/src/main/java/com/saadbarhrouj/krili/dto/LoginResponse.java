package com.saadbarhrouj.krili.dto;

public class LoginResponse {
    private String token;

    public LoginResponse() {
    }

    // Constructeur avec arguments
    public LoginResponse(String token) {
        this.token = token;
    }

    // Getter pour token
    public String getToken() {
        return token;
    }

    // Setter pour token
    public void setToken(String token) {
        this.token = token;
    }

    // toString (utile pour le débogage, optionnel)
    @Override
    public String toString() {
        String shortToken = (token != null && token.length() > 10) ? token.substring(0, 10) + "..." : token;
        return "LoginResponse{" +
                "token='" + shortToken + "[PROTECTED]" + '\'' +
                '}';
    }

}