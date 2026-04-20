package com.syllabussync.config;

import com.syllabussync.security.SupabaseJwtFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * HTTP security for SyllabusSync.
 *
 * The app authenticates via Supabase-issued JWTs (see {@link SupabaseJwtFilter}).
 * A small set of routes stay public:
 *   - Health / OpenAPI endpoints (for Render's health check + dev exploration).
 *   - The Google OAuth *callback* (top-level browser redirect with no
 *     Authorization header; the user is carried in a signed `state` param).
 *
 * Every other `/api/**` route requires a valid session when
 * {@code app.auth.required=true} (production). In dev, auth is enforced only
 * opportunistically so legacy smoke tests keep working.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final SupabaseJwtFilter supabaseJwtFilter;
    private final boolean authRequired;
    private final List<String> allowedOrigins;

    public SecurityConfig(
            SupabaseJwtFilter supabaseJwtFilter,
            @Value("${app.auth.required:false}") boolean authRequired,
            @Value("${app.cors.allowed-origins:*}") String allowedOriginsCsv) {
        this.supabaseJwtFilter = supabaseJwtFilter;
        this.authRequired = authRequired;
        this.allowedOrigins = Arrays.stream(allowedOriginsCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(supabaseJwtFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(eh -> eh.authenticationEntryPoint((req, res, ex) ->
                    res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Not signed in")))
            .headers(headers -> headers.frameOptions().disable()); // H2 console (dev only)

        if (authRequired) {
            http.authorizeHttpRequests(authz -> authz
                    .requestMatchers("/actuator/**").permitAll()
                    .requestMatchers("/h2-console/**").permitAll()
                    .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                    // OAuth callback has no Authorization header — user id is carried via signed `state`.
                    .requestMatchers("/api/syllabus/auth/google/callback").permitAll()
                    // Public auth URL generator so unauthenticated UI can kick off Google connect.
                    .requestMatchers("/api/auth/google/url").permitAll()
                    .requestMatchers("/api/auth/me").permitAll()
                    .requestMatchers("/error").permitAll()
                    .anyRequest().authenticated()
            );
        } else {
            http.authorizeHttpRequests(authz -> authz.anyRequest().permitAll());
        }

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        if (allowedOrigins.isEmpty() || allowedOrigins.contains("*")) {
            configuration.setAllowedOriginPatterns(List.of("*"));
        } else {
            configuration.setAllowedOrigins(allowedOrigins);
        }
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
