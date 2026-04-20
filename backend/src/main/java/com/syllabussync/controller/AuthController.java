package com.syllabussync.controller;

import com.syllabussync.security.CurrentUser;
import com.syllabussync.security.CurrentUserResolver;
import com.syllabussync.security.OAuthStateCodec;
import com.syllabussync.service.GoogleCalendarService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Per-user account + Google Calendar connection endpoints.
 *
 * Authentication happens upstream in {@link com.syllabussync.security.SupabaseJwtFilter};
 * every handler here derives the caller's identity from
 * {@link CurrentUserResolver}, so calendar tokens, connection state, and
 * disconnection all scope to the signed-in Supabase user — no more shared
 * "default-user" bucket.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private GoogleCalendarService googleCalendarService;
    @Autowired private CurrentUserResolver currentUserResolver;
    @Autowired private OAuthStateCodec oAuthStateCodec;

    /**
     * Returns the authenticated Supabase profile, or {@code authenticated=false}
     * when the caller has no session. The frontend uses this as the single
     * source of truth for "am I signed in" after boot.
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me() {
        CurrentUser u = currentUserResolver.currentUserOrNull();
        Map<String, Object> body = new HashMap<>();
        if (u == null) {
            body.put("authenticated", false);
            return ResponseEntity.ok(body);
        }
        body.put("authenticated", true);
        body.put("id", u.supabaseUserId());
        body.put("email", u.email());
        body.put("name", u.fullName());
        body.put("avatar", u.avatarUrl());
        return ResponseEntity.ok(body);
    }

    /**
     * Builds the Google OAuth URL with a signed {@code state} param that
     * carries the current Supabase user id through to the callback. If the
     * user isn't signed in yet, we surface a 401 so the UI can prompt them
     * to sign in first rather than binding the tokens to "default-user".
     */
    @GetMapping("/google/url")
    public ResponseEntity<Map<String, String>> getGoogleAuthUrl() {
        try {
            String userId = currentUserResolver.requireUserId();
            String state = oAuthStateCodec.encode(userId);
            String authUrl = googleCalendarService.getAuthorizationUrl(state);
            Map<String, String> response = new HashMap<>();
            response.put("authUrl", authUrl);
            response.put("message", "Google OAuth URL generated successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to generate Google OAuth URL: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @GetMapping("/google/status")
    public ResponseEntity<Map<String, Object>> getConnectionStatus() {
        try {
            CurrentUser u = currentUserResolver.currentUserOrNull();
            if (u == null) {
                return ResponseEntity.ok(Map.of(
                        "connected", false,
                        "message", "Not signed in"));
            }
            String userId = u.supabaseUserId();
            boolean isConnected = googleCalendarService.isUserConnected(userId);

            Map<String, Object> response = new HashMap<>();
            response.put("connected", isConnected);
            response.put("userId", userId);
            response.put("message", isConnected ? "Google Calendar is connected" : "Google Calendar is not connected");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to check connection status: " + e.getMessage());
            errorResponse.put("connected", false);
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @PostMapping("/google/disconnect")
    public ResponseEntity<Map<String, Object>> disconnectGoogle() {
        try {
            String userId = currentUserResolver.requireUserId();
            googleCalendarService.disconnectUser(userId);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Google Calendar disconnected successfully");
            response.put("connected", false);
            response.put("userId", userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to disconnect Google Calendar: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @PostMapping("/google/refresh")
    public ResponseEntity<Map<String, Object>> refreshGoogleToken() {
        try {
            String userId = currentUserResolver.requireUserId();
            boolean isConnected = googleCalendarService.isUserConnected(userId);

            Map<String, Object> response = new HashMap<>();
            response.put("connected", isConnected);
            response.put("userId", userId);
            response.put("message", isConnected ? "Token is valid" : "Token needs refresh - please reconnect");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to refresh token: " + e.getMessage());
            errorResponse.put("connected", false);
            return ResponseEntity.internalServerError().body(errorResponse);
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
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to get token info: " + e.getMessage());
            errorResponse.put("connected", false);
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
}
