package com.syllabussync.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.syllabussync.security.CurrentUser;
import com.syllabussync.security.CurrentUserResolver;
import com.syllabussync.security.JwtService;
import com.syllabussync.security.OAuthStateCodec;
import com.syllabussync.service.GoogleCalendarService;
import com.syllabussync.service.UserAccountService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private GoogleCalendarService googleCalendarService;
    @Autowired private CurrentUserResolver currentUserResolver;
    @Autowired private OAuthStateCodec oAuthStateCodec;
    @Autowired private JwtService jwtService;
    @Autowired private UserAccountService userAccountService;

    @Value("${google.client-id:}")
    private String googleClientId;

    @Value("${google.client-secret:}")
    private String googleClientSecret;

    @Value("${google.auth-redirect-uri:http://localhost:8080/api/auth/google/callback}")
    private String googleAuthRedirectUri;

    @Value("${app.auth.login-success-url:http://localhost:3000}")
    private String loginSuccessUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Google Sign-In ──────────────────────────────────────────────────────

    /**
     * Redirects the browser to Google's OAuth consent screen.
     * The signed {@code state} param guards against CSRF on the callback.
     */
    @GetMapping("/google/login")
    public void googleLogin(HttpServletResponse response) throws IOException {
        String state = oAuthStateCodec.encode("signin");
        String url = "https://accounts.google.com/o/oauth2/v2/auth"
                + "?client_id=" + encode(googleClientId)
                + "&redirect_uri=" + encode(googleAuthRedirectUri)
                + "&response_type=code"
                + "&scope=openid+email+profile"
                + "&state=" + encode(state)
                + "&access_type=offline"
                + "&prompt=select_account";
        response.sendRedirect(url);
    }

    /**
     * Google redirects here after the user consents.
     * We exchange the code for tokens, fetch user info, issue our own JWT,
     * and redirect the browser back to the frontend with the token in the URL.
     */
    @GetMapping("/google/callback")
    public void googleCallback(
            @RequestParam String code,
            @RequestParam(required = false) String state,
            HttpServletResponse response) throws IOException {

        if (oAuthStateCodec.decode(state) == null) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid or expired state");
            return;
        }

        try {
            Map<String, Object> tokenResp = exchangeCodeForTokens(code);
            String accessToken = (String) tokenResp.get("access_token");
            if (accessToken == null) {
                response.sendError(HttpServletResponse.SC_BAD_GATEWAY, "Token exchange failed");
                return;
            }

            Map<String, Object> userInfo = fetchUserInfo(accessToken);
            String googleSub = (String) userInfo.get("sub");
            String email    = (String) userInfo.get("email");
            String name     = (String) userInfo.get("name");
            String picture  = (String) userInfo.get("picture");

            userAccountService.getOrCreateUserForGoogleSub(googleSub, email, name);
            String jwt = jwtService.issue(googleSub, email, name, picture);

            String redirectUrl = loginSuccessUrl + "?token=" + encode(jwt);
            response.sendRedirect(redirectUrl);
        } catch (Exception e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Sign-in failed: " + e.getMessage());
        }
    }

    // ── Auth state ──────────────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me() {
        CurrentUser u = currentUserResolver.currentUserOrNull();
        Map<String, Object> body = new HashMap<>();
        if (u == null) {
            body.put("authenticated", false);
            return ResponseEntity.ok(body);
        }
        body.put("authenticated", true);
        body.put("id", u.userId());
        body.put("email", u.email());
        body.put("name", u.fullName());
        body.put("avatar", u.avatarUrl());
        return ResponseEntity.ok(body);
    }

    // ── Google Calendar connection ──────────────────────────────────────────

    @GetMapping("/google/url")
    public ResponseEntity<Map<String, String>> getGoogleAuthUrl() {
        try {
            String userId = currentUserResolver.requireUserId();
            String state = oAuthStateCodec.encode(userId);
            String authUrl = googleCalendarService.getAuthorizationUrl(state);
            return ResponseEntity.ok(Map.of(
                    "authUrl", authUrl,
                    "message", "Google OAuth URL generated successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to generate Google OAuth URL: " + e.getMessage()));
        }
    }

    @GetMapping("/google/status")
    public ResponseEntity<Map<String, Object>> getConnectionStatus() {
        try {
            CurrentUser u = currentUserResolver.currentUserOrNull();
            if (u == null) {
                return ResponseEntity.ok(Map.of("connected", false, "message", "Not signed in"));
            }
            boolean connected = googleCalendarService.isUserConnected(u.userId());
            return ResponseEntity.ok(Map.of(
                    "connected", connected,
                    "userId", u.userId(),
                    "message", connected ? "Google Calendar is connected" : "Google Calendar is not connected"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage(), "connected", false));
        }
    }

    @PostMapping("/google/disconnect")
    public ResponseEntity<Map<String, Object>> disconnectGoogle() {
        try {
            String userId = currentUserResolver.requireUserId();
            googleCalendarService.disconnectUser(userId);
            return ResponseEntity.ok(Map.of(
                    "message", "Google Calendar disconnected successfully",
                    "connected", false,
                    "userId", userId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/google/refresh")
    public ResponseEntity<Map<String, Object>> refreshGoogleToken() {
        try {
            String userId = currentUserResolver.requireUserId();
            boolean connected = googleCalendarService.isUserConnected(userId);
            return ResponseEntity.ok(Map.of(
                    "connected", connected,
                    "userId", userId,
                    "message", connected ? "Token is valid" : "Token needs refresh - please reconnect"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage(), "connected", false));
        }
    }

    @GetMapping("/google/token-info")
    public ResponseEntity<Map<String, Object>> getTokenInfo() {
        try {
            String userId = currentUserResolver.requireUserId();
            Map<String, Object> tokenInfo = googleCalendarService.getTokenInfo(userId);
            tokenInfo.put("userId", userId);
            return ResponseEntity.ok(tokenInfo);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage(), "connected", false));
        }
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> exchangeCodeForTokens(String code) throws Exception {
        String body = "grant_type=authorization_code"
                + "&code=" + encode(code)
                + "&redirect_uri=" + encode(googleAuthRedirectUri)
                + "&client_id=" + encode(googleClientId)
                + "&client_secret=" + encode(googleClientSecret);

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://oauth2.googleapis.com/token"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(res.body(), Map.class);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchUserInfo(String accessToken) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://www.googleapis.com/oauth2/v3/userinfo"))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .timeout(Duration.ofSeconds(10))
                .build();

        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(res.body(), Map.class);
    }

    private static String encode(String s) {
        return URLEncoder.encode(s == null ? "" : s, StandardCharsets.UTF_8);
    }
}
