package com.saadbarhrouj.krili.config;

import com.saadbarhrouj.krili.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger; // AJOUTE CET IMPORT
import org.slf4j.LoggerFactory; // AJOUTE CET IMPORT
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class); // AJOUTE CETTE LIGNE

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);

        try {
            userEmail = jwtService.extractUsername(jwt);

            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );
                    SecurityContextHolder.getContext().setAuthentication(authToken);

                    // >>>>>>>>> LOG IMPORTANT À VÉRIFIER <<<<<<<<<<<
                    log.debug("JwtAuthenticationFilter: Utilisateur {} authentifié. Autorités mises dans le contexte: {}",
                            userEmail, userDetails.getAuthorities());
                    // >>>>>>>>> FIN LOG IMPORTANT <<<<<<<<<<<
                } else {
                    log.warn("JwtAuthenticationFilter: Token invalide pour utilisateur {}", userEmail);
                }
            }
            filterChain.doFilter(request, response);

        } catch (Exception e) {
            log.error("JwtAuthenticationFilter: Erreur lors du traitement du token JWT pour la requête {} - {}", request.getRequestURI(), e.getMessage());
            // Ne pas propager l'exception ici pour permettre à d'autres filtres de potentiellement gérer
            // ou pour que l'accès soit refusé plus tard si la ressource est protégée.
            // Si on veut une réponse immédiate d'erreur (ex: 401 non standardisé), il faudrait écrire dans la response ici.
            // Mais généralement, on laisse Spring Security gérer le refus d'accès.
            filterChain.doFilter(request, response); // Important de toujours appeler filterChain
        }
    }
}