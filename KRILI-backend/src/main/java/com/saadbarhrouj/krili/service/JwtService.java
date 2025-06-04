package com.saadbarhrouj.krili.service;

import com.saadbarhrouj.krili.model.Etudiant; // Assurez-vous que cet import est présent
import com.saadbarhrouj.krili.model.Proprietaire;
import com.saadbarhrouj.krili.model.Utilisateur;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    @Value("${jwt.secret:MonSuperSecretQuiEstTresLongEtAleatoirePourLaSignatureDesTokensJWTKriliApp777}")
    private String secretKeyString;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpiration;

    private Key signInKey;

    @PostConstruct
    public void init() {
        if (this.secretKeyString == null || this.secretKeyString.isBlank()) {
            log.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            log.error("!!! ERREUR CRITIQUE : jwt.secret n'est pas configuré ou est vide.          !!!");
            log.error("!!! Vérifiez votre fichier application.properties.                         !!!");
            log.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            throw new IllegalStateException("jwt.secret doit être configuré dans application.properties et ne peut pas être vide.");
        }
        if (this.secretKeyString.getBytes(StandardCharsets.UTF_8).length < 32) {
            log.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            log.warn("!!! AVERTISSEMENT : La clé jwt.secret semble courte pour HS256 (moins de 32 octets). !!!");
            log.warn("!!! Pour la production, utilisez une clé secrète longue et aléatoire.                !!!");
            log.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        }
        log.debug("JwtService: Initialisation avec la clé secrète. Longueur de la chaîne de clé: {}", secretKeyString.length());
        byte[] keyBytes = this.secretKeyString.getBytes(StandardCharsets.UTF_8);
        this.signInKey = Keys.hmacShaKeyFor(keyBytes);
        log.debug("JwtService: Clé de signature initialisée.");
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList()));
        log.debug("Ajout claim 'roles': {}", claims.get("roles"));

        if (userDetails instanceof Utilisateur utilisateur) {
            log.debug("Génération token pour Utilisateur: {}", utilisateur.getEmail());
            claims.put("userId", utilisateur.getId()); // Ajout de l'ID utilisateur
            if (utilisateur.getNom() != null && !utilisateur.getNom().isBlank()) {
                claims.put("fullName", utilisateur.getNom());
            } else {
                claims.put("fullName", utilisateur.getEmail().split("@")[0]);
            }
            if (utilisateur.getAvatar() != null && !utilisateur.getAvatar().isBlank()) {
                claims.put("avatar", utilisateur.getAvatar());
            }

            if (utilisateur instanceof Etudiant etudiantDetails) {
                log.debug("L'utilisateur est un Etudiant. Ajout des claims académiques.");
                if (etudiantDetails.getEtablissement() != null && !etudiantDetails.getEtablissement().isBlank()) {
                    claims.put("etablissement", etudiantDetails.getEtablissement());
                }
                if (etudiantDetails.getVilleEtude() != null && !etudiantDetails.getVilleEtude().isBlank()) {
                    claims.put("villeEtude", etudiantDetails.getVilleEtude());
                }
                if (etudiantDetails.getFiliere() != null && !etudiantDetails.getFiliere().isBlank()) {
                    claims.put("filiere", etudiantDetails.getFiliere());
                }
                claims.put("anneeEtude", etudiantDetails.getAnneeEtude());
            }

            if (utilisateur instanceof Proprietaire proprietaireDetails) {
                if (proprietaireDetails.getStatut() != null && !proprietaireDetails.getStatut().isBlank()) {
                    claims.put("statut", proprietaireDetails.getStatut());
                }
                if (proprietaireDetails.getNomAgence() != null && !proprietaireDetails.getNomAgence().isBlank()) {
                    claims.put("nomAgence", proprietaireDetails.getNomAgence());
                }
                if (proprietaireDetails.getSiret() != null && !proprietaireDetails.getSiret().isBlank()) {
                    claims.put("siret", proprietaireDetails.getSiret());
                }
            }
            if (utilisateur.getTelephone() != null && !utilisateur.getTelephone().isBlank()) {
                claims.put("telephone", utilisateur.getTelephone());
            }

        } else {
            log.warn("UserDetails n'est pas une instance de Utilisateur. Type: {}", userDetails.getClass().getName());
            claims.put("fullName", userDetails.getUsername().split("@")[0]);
        }
        return buildToken(claims, userDetails, jwtExpiration);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        if (!extraClaims.containsKey("roles")) {
            extraClaims.put("roles", userDetails.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .collect(Collectors.toList()));
        }
        return buildToken(extraClaims, userDetails, jwtExpiration);
    }

    private String buildToken(Map<String, Object> claims, UserDetails userDetails, long expiration) {
        if (this.signInKey == null) {
            log.error("ERREUR CRITIQUE : Tentative de construire un token alors que signInKey est null.");
            throw new IllegalStateException("Clé de signature JWT non initialisée.");
        }
        log.debug("Construction du token pour: {} avec claims: {}", userDetails.getUsername(), claims.keySet());
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(this.signInKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            boolean usernameMatches = username.equals(userDetails.getUsername());
            boolean tokenNotExpired = !isTokenExpired(token);
            log.trace("Validation token pour {}: Username Match? {}, Non Expired? {}", username, usernameMatches, tokenNotExpired);
            return usernameMatches && tokenNotExpired;
        } catch (SignatureException e) {
            log.warn("Validation JWT échouée : Signature invalide - {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.warn("Validation JWT échouée : Token malformé - {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.warn("Validation JWT échouée : Token expiré - {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.warn("Validation JWT échouée : Token non supporté - {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("Validation JWT échouée : Claims vides ou argument invalide - {}", e.getMessage());
        } catch (Exception e) {
            log.error("Validation JWT échouée : Erreur inattendue - {}", e.getMessage(), e);
        }
        return false;
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        if (this.signInKey == null) {
            log.error("ERREUR CRITIQUE : Tentative d'extraire les claims alors que signInKey est null.");
            throw new IllegalStateException("Clé de signature JWT non initialisée pour l'extraction des claims.");
        }
        return Jwts.parserBuilder()
                .setSigningKey(this.signInKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}