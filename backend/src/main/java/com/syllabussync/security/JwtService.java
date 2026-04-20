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

@Component
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration:86400000}") long expirationMs) {
        byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
        if (raw.length < 32) {
            // pad to minimum 256-bit key required by HS256
            String padded = (secret + secret + secret).substring(0, 32);
            raw = padded.getBytes(StandardCharsets.UTF_8);
        }
        this.key = Keys.hmacShaKeyFor(raw);
        this.expirationMs = expirationMs;
    }

    public String issue(String userId, String email, String name, String avatarUrl) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(userId)
                .claim("email", email)
                .claim("name", name)
                .claim("picture", avatarUrl)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expirationMs))
                .signWith(key)
                .compact();
    }

    public CurrentUser verify(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            String sub = claims.getSubject();
            if (sub == null || sub.isBlank()) return null;
            return new CurrentUser(
                    sub,
                    str(claims.get("email")),
                    str(claims.get("name")),
                    str(claims.get("picture")));
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    private static String str(Object v) {
        return v == null ? null : v.toString();
    }
}
