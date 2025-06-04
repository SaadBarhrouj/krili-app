package com.saadbarhrouj.krili.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.frameoptions.XFrameOptionsHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @Autowired
    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter, UserDetailsService userDetailsService) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(authz -> authz
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/h2-console/**").permitAll()
                        .requestMatchers("/api/images/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/logements", "/api/logements/{id}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/proprietaires/{id}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/villes", "/api/villes/{id}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/etablissements", "/api/etablissements/all", "/api/etablissements/{id}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/logements/{logementId}/reviews").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/proprietaires/{proprietaireId}/reviews").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/etudiants/{etudiantId}/reviews").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/reservations/dates-reservees-confirmees").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reservations/dates-demandes-en-attente").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/reservations/demande").hasRole("ETUDIANT")
                        .requestMatchers(HttpMethod.POST, "/api/reservations/{reservationId}/accepter").hasRole("PROPRIETAIRE")
                        .requestMatchers(HttpMethod.POST, "/api/reservations/{reservationId}/refuser").hasRole("PROPRIETAIRE")
                        .requestMatchers(HttpMethod.POST, "/api/reservations/{reservationId}/annuler-etudiant").hasRole("ETUDIANT")
                        .requestMatchers(HttpMethod.POST, "/api/reservations/{reservationId}/commencer-location").hasRole("PROPRIETAIRE")
                        .requestMatchers(HttpMethod.POST, "/api/reservations/{reservationId}/terminer-location").hasRole("PROPRIETAIRE")
                        .requestMatchers(HttpMethod.GET, "/api/reservations/etudiant").hasRole("ETUDIANT")
                        .requestMatchers(HttpMethod.GET, "/api/reservations/proprietaire").hasRole("PROPRIETAIRE")

                        .requestMatchers(HttpMethod.GET, "/api/logements/{id}/favorite-status").hasRole("ETUDIANT")
                        .requestMatchers(HttpMethod.POST, "/api/logements/{id}/favorite").hasRole("ETUDIANT")
                        .requestMatchers(HttpMethod.DELETE, "/api/logements/{id}/favorite").hasRole("ETUDIANT")
                        .requestMatchers(HttpMethod.GET, "/api/logements/mes-favoris").hasRole("ETUDIANT")

                        .requestMatchers(HttpMethod.PUT, "/api/logements/{id}").hasRole("PROPRIETAIRE")
                        .requestMatchers(HttpMethod.DELETE, "/api/logements/{id}").hasRole("PROPRIETAIRE")
                        .requestMatchers(HttpMethod.POST, "/api/logements/{id}/**").hasRole("PROPRIETAIRE")
                        .requestMatchers(HttpMethod.POST, "/api/logements/creer").hasRole("PROPRIETAIRE")

                        .requestMatchers(HttpMethod.POST, "/api/reviews").hasAnyRole("ETUDIANT", "PROPRIETAIRE")
                        .requestMatchers(HttpMethod.GET, "/api/reviews/can-review").authenticated()

                        .requestMatchers(HttpMethod.GET, "/api/notifications", "/api/notifications/**").hasRole("ETUDIANT")
                        .requestMatchers(HttpMethod.POST, "/api/notifications/**").hasRole("ETUDIANT")

                        .requestMatchers(HttpMethod.GET, "/api/profil/proprietaire").hasRole("PROPRIETAIRE")
                        .requestMatchers(HttpMethod.PATCH, "/api/profil/proprietaire").hasRole("PROPRIETAIRE")
                        .requestMatchers(HttpMethod.PATCH, "/api/profil/etudiant").hasRole("ETUDIANT")

                        .requestMatchers(HttpMethod.GET, "/api/proprietaires/{id}/subscription-status").hasRole("ETUDIANT")
                        .requestMatchers(HttpMethod.POST, "/api/proprietaires/{id}/subscribe").hasRole("ETUDIANT")
                        .requestMatchers(HttpMethod.DELETE, "/api/proprietaires/{id}/subscribe").hasRole("ETUDIANT")
                        .requestMatchers(HttpMethod.GET, "/api/etudiants/{etudiantId}/profil-public").authenticated()
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .headers(headers -> headers
                        .addHeaderWriter(new XFrameOptionsHeaderWriter(XFrameOptionsHeaderWriter.XFrameOptionsMode.SAMEORIGIN))
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:4200"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Cache-Control", "Content-Type", "X-Requested-With", "Accept", "Origin"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}