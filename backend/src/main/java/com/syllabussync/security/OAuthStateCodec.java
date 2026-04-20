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
 * Encodes the current user id into the OAuth `state` param when kicking off
 * the Google Calendar connect flow, then verifies it on the callback.
 *
 * Why this exists: the Google OAuth callback is a top-level browser redirect
 * — there's no Authorization header to carry our Supabase session through.
 * We sign the user id into a short-lived JWT, send it as `state`, and trust
 * only the signature when the code comes back.
 *
 * The signing key defaults to the Supabase JWT secret when one is set (so no
 * extra config is needed in production), and falls back to a stable local key
 * in dev. This mirrors how e.g. NextAuth handles CSRF.
 */
@Component
public class OAuthStateCodec {

    private static final long STATE_TTL_MS = 10 * 60 * 1000L; // 10 minutes is plenty for a user to finish the consent screen

    private final SecretKey key;

    public OAuthStateCodec(
            @Value("${supabase.jwt-secret:}") String supabaseSecret,
            @Value("${app.oauth.state-secret:syllabussync-local-oauth-state-secret-change-me-please}") String fallback) {
        String raw = (supabaseSecret != null && !supabaseSecret.isBlank()) ? supabaseSecret : fallback;
        // jjwt requires ≥ 256 bits; pad with the fallback if somebody supplies a tiny secret locally.
        if (raw.getBytes(StandardCharsets.UTF_8).length < 32) {
            raw = (raw + fallback + fallback).substring(0, Math.max(32, raw.length()));
        }
        this.key = Keys.hmacShaKeyFor(raw.getBytes(StandardCharsets.UTF_8));
    }

    public String encode(String userId) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(userId)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + STATE_TTL_MS))
                .signWith(key)
                .compact();
    }

    /** Returns the user id, or null if the state is invalid or expired. */
    public String decode(String state) {
        if (state == null || state.isBlank()) {
            return null;
        }
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
