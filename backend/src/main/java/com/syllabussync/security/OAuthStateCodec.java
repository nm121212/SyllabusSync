package com.syllabussync.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Signs the OAuth {@code state} param for Google Calendar connect and Google
 * Sign-In flows, preventing CSRF on the callback.
 *
 * Uses the same secret as the main JWT service so no extra config is needed.
 */
@Component
public class OAuthStateCodec {

    private static final long STATE_TTL_MS = 10 * 60 * 1000L;

    private final SecretKey key;

    public OAuthStateCodec(
            @Value("${app.jwt.secret:}") String jwtSecret,
            @Value("${app.oauth.state-secret:syllabussync-local-oauth-state-secret-change-me-please}") String fallback) {
        String raw = (jwtSecret != null && !jwtSecret.isBlank()) ? jwtSecret : fallback;
        if (raw.getBytes(StandardCharsets.UTF_8).length < 32) {
            raw = (raw + fallback + fallback).substring(0, Math.max(32, raw.length()));
        }
        this.key = Keys.hmacShaKeyFor(raw.getBytes(StandardCharsets.UTF_8));
    }

    public String encode(String subject) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + STATE_TTL_MS))
                .signWith(key)
                .compact();
    }

    public String decode(String state) {
        if (state == null || state.isBlank()) return null;
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(state)
                    .getBody();
            return claims.getSubject();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
