package com.syllabussync.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwsHeader;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SigningKeyResolverAdapter;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.AlgorithmParameters;
import java.security.Key;
import java.security.KeyFactory;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPublicKeySpec;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Validates the Supabase-issued JWT sent as `Authorization: Bearer …` on every
 * request. Supabase may sign access tokens using modern asymmetric JWT signing
 * keys (e.g. ES256) or legacy HS256 shared-secret mode.
 *
 * We verify the signature, extract the `sub` + `email` claims, and attach a
 * {@link CurrentUser} to the Spring SecurityContext so downstream controllers
 * can key calendar tokens / tasks / calendar events by the real user id
 * instead of the legacy "default-user" string.
 *
 * Design notes:
 *  - Preferred mode: verify via Supabase JWKS (`/auth/v1/.well-known/jwks.json`)
 *    using the token `kid`.
 *  - Backward-compatible fallback: if token alg is HS* and `SUPABASE_JWT_SECRET`
 *    is configured, verify using that shared secret.
 *  - If neither verifier can validate a token, we leave request unauthenticated.
 *  - Unauthenticated requests are *not* rejected here — the {@link com.syllabussync.config.SecurityConfig}
 *    chain decides which routes require a principal. This keeps the filter
 *    side-effect free and easy to reason about.
 */
@Component
public class SupabaseJwtFilter extends OncePerRequestFilter {

    private static final String AUTH_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final Duration JWKS_CACHE_TTL = Duration.ofMinutes(10);

    private final String supabaseUrl;
    private final String jwtSecret;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, Key> jwksKeyCache = new ConcurrentHashMap<>();
    private volatile long jwksCachedAtMs = 0L;
    private volatile ECParameterSpec p256Params;

    public SupabaseJwtFilter(
            @Value("${supabase.url:}") String supabaseUrl,
            @Value("${supabase.jwt-secret:}") String jwtSecret) {
        this.supabaseUrl = trimTrailingSlash(supabaseUrl == null ? "" : supabaseUrl.trim());
        this.jwtSecret = jwtSecret == null ? "" : jwtSecret.trim();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
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
        String alg = tokenAlg(token);
        try {
            if (alg != null && alg.startsWith("HS") && !jwtSecret.isEmpty()) {
                Claims claims = Jwts.parserBuilder()
                        .setSigningKey(hsSecretKey())
                        .build()
                        .parseClaimsJws(token)
                        .getBody();
                return claimsToUser(claims);
            }

            if (!supabaseUrl.isEmpty()) {
                Claims claims = Jwts.parserBuilder()
                        .setSigningKeyResolver(new SigningKeyResolverAdapter() {
                            @Override
                            public Key resolveSigningKey(JwsHeader header, Claims claims) {
                                String kid = header == null ? null : asString(header.getKeyId());
                                if (kid == null || kid.isBlank()) {
                                    throw new JwtException("Missing kid in JWT header");
                                }
                                Key key = keyForKid(kid);
                                if (key == null) {
                                    throw new JwtException("Unknown signing key");
                                }
                                return key;
                            }
                        })
                        .build()
                        .parseClaimsJws(token)
                        .getBody();
                return claimsToUser(claims);
            }
        } catch (JwtException | IllegalArgumentException ignored) {
            // Try fallback verifier below.
        }

        if (!jwtSecret.isEmpty()) {
            try {
                Claims claims = Jwts.parserBuilder()
                        .setSigningKey(hsSecretKey())
                        .build()
                        .parseClaimsJws(token)
                        .getBody();
                return claimsToUser(claims);
            } catch (JwtException | IllegalArgumentException ignored) {
                return null;
            }
        }
        return null;
    }

    private CurrentUser claimsToUser(Claims claims) {
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
    }

    private SecretKey hsSecretKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    private String tokenAlg(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return null;
            byte[] decoded = Base64.getUrlDecoder().decode(parts[0]);
            JsonNode header = objectMapper.readTree(decoded);
            return asString(header.get("alg"));
        } catch (Exception e) {
            return null;
        }
    }

    private Key keyForKid(String kid) {
        maybeRefreshJwks();
        return jwksKeyCache.get(kid);
    }

    private void maybeRefreshJwks() {
        long now = System.currentTimeMillis();
        if (!jwksKeyCache.isEmpty() && (now - jwksCachedAtMs) < JWKS_CACHE_TTL.toMillis()) {
            return;
        }
        synchronized (this) {
            now = System.currentTimeMillis();
            if (!jwksKeyCache.isEmpty() && (now - jwksCachedAtMs) < JWKS_CACHE_TTL.toMillis()) {
                return;
            }
            Map<String, Key> refreshed = fetchJwksKeys();
            if (!refreshed.isEmpty()) {
                jwksKeyCache.clear();
                jwksKeyCache.putAll(refreshed);
                jwksCachedAtMs = now;
            }
        }
    }

    private Map<String, Key> fetchJwksKeys() {
        Map<String, Key> out = new HashMap<>();
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(supabaseUrl + "/auth/v1/.well-known/jwks.json"))
                    .header(HttpHeaders.ACCEPT, "application/json")
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                return out;
            }
            JsonNode root = objectMapper.readTree(res.body());
            JsonNode keys = root.path("keys");
            if (!keys.isArray()) return out;
            for (JsonNode node : keys) {
                String kid = node.path("kid").asText("");
                String kty = node.path("kty").asText("");
                if (kid.isBlank() || kty.isBlank()) continue;
                Key key = toPublicKey(kty, node);
                if (key != null) {
                    out.put(kid, key);
                }
            }
        } catch (Exception ignored) {
            return Map.of();
        }
        return out;
    }

    private Key toPublicKey(String kty, JsonNode node) throws Exception {
        if ("RSA".equalsIgnoreCase(kty)) {
            byte[] n = b64Url(node.path("n").asText(""));
            byte[] e = b64Url(node.path("e").asText(""));
            if (n.length == 0 || e.length == 0) return null;
            RSAPublicKeySpec spec = new RSAPublicKeySpec(
                    new BigInteger(1, n),
                    new BigInteger(1, e));
            return KeyFactory.getInstance("RSA").generatePublic(spec);
        }
        if ("EC".equalsIgnoreCase(kty)) {
            String crv = node.path("crv").asText("");
            if (!"P-256".equalsIgnoreCase(crv)) {
                return null;
            }
            byte[] x = b64Url(node.path("x").asText(""));
            byte[] y = b64Url(node.path("y").asText(""));
            if (x.length == 0 || y.length == 0) return null;
            ECPoint point = new ECPoint(new BigInteger(1, x), new BigInteger(1, y));
            ECPublicKeySpec spec = new ECPublicKeySpec(point, p256Params());
            return KeyFactory.getInstance("EC").generatePublic(spec);
        }
        return null;
    }

    private ECParameterSpec p256Params() throws Exception {
        if (p256Params != null) return p256Params;
        synchronized (this) {
            if (p256Params != null) return p256Params;
            AlgorithmParameters parameters = AlgorithmParameters.getInstance("EC");
            parameters.init(new ECGenParameterSpec("secp256r1"));
            p256Params = parameters.getParameterSpec(ECParameterSpec.class);
            return p256Params;
        }
    }

    private static byte[] b64Url(String s) {
        if (s == null || s.isBlank()) return new byte[0];
        return Base64.getUrlDecoder().decode(s);
    }

    private static String trimTrailingSlash(String s) {
        if (s == null) return "";
        while (s.endsWith("/")) {
            s = s.substring(0, s.length() - 1);
        }
        return s;
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
