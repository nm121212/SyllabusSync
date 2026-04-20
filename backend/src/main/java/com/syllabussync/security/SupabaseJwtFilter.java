package com.syllabussync.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * Validates the Supabase-issued JWT sent as `Authorization: Bearer …` on every
 * request. Supabase signs access tokens with its project JWT secret (HS256).
 * We verify the signature, extract the `sub` + `email` claims, and attach a
 * {@link CurrentUser} to the Spring SecurityContext so downstream controllers
 * can key calendar tokens / tasks / calendar events by the real user id
 * instead of the legacy "default-user" string.
 *
 * Design notes:
 *  - If `SUPABASE_JWT_SECRET` is not configured (e.g. local dev before the
 *    Supabase project is linked), we skip verification entirely. The security
 *    chain then falls back to its permit-all rules, which keeps legacy smoke
 *    tests working until Supabase is wired in.
 *  - Unauthenticated requests are *not* rejected here — the {@link com.syllabussync.config.SecurityConfig}
 *    chain decides which routes require a principal. This keeps the filter
 *    side-effect free and easy to reason about.
 */
@Component
public class SupabaseJwtFilter extends OncePerRequestFilter {

    private static final String AUTH_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final String jwtSecret;

    public SupabaseJwtFilter(
            @Value("${supabase.jwt-secret:}") String jwtSecret) {
        this.jwtSecret = jwtSecret == null ? "" : jwtSecret.trim();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        if (!jwtSecret.isEmpty()) {
            String header = request.getHeader(AUTH_HEADER);
            if (header != null && header.startsWith(BEARER_PREFIX)) {
                String token = header.substring(BEARER_PREFIX.length()).trim();
                CurrentUser user = parseToken(token);
                if (user != null) {
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    user,
                                    null,
                                    List.of(new SimpleGrantedAuthority("ROLE_USER")));
                    auth.setDetails(user);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        }
        filterChain.doFilter(request, response);
    }

    /**
     * Parses and verifies the Supabase access token. Returns null on any
     * validation failure — the caller treats that as "unauthenticated".
     *
     * We *don't* throw, because the callback endpoint and health check should
     * still succeed for unauthenticated clients.
     */
    private CurrentUser parseToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            Jws<Claims> parsed = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token);
            Claims claims = parsed.getBody();

            String sub = claims.getSubject();
            if (sub == null || sub.isBlank()) {
                return null;
            }

            String email = asString(claims.get("email"));
            String fullName = null;
            String avatar = null;

            Object meta = claims.get("user_metadata");
            if (meta instanceof Map<?, ?> metaMap) {
                fullName = firstNonBlank(
                        asString(metaMap.get("full_name")),
                        asString(metaMap.get("name")));
                avatar = asString(metaMap.get("avatar_url"));
                if (email == null || email.isBlank()) {
                    email = asString(metaMap.get("email"));
                }
            }

            return new CurrentUser(sub, email, fullName, avatar);
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    private static String asString(Object v) {
        return v == null ? null : v.toString();
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return null;
    }
}
