package com.syllabussync.controller;

import com.syllabussync.service.GoogleCalendarService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private GoogleCalendarService googleCalendarService;

    @GetMapping("/google/url")
    public ResponseEntity<Map<String, String>> getGoogleAuthUrl() {
        try {
            String authUrl = googleCalendarService.getAuthorizationUrl();
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

    @PostMapping("/google/callback")
    public ResponseEntity<Map<String, Object>> handleGoogleCallback(
            @RequestParam("code") String code,
            @RequestParam(value = "state", required = false) String state) {
        try {
            // For now, use a default user ID since we removed user authentication
            // In a real app, you'd get this from the authenticated user session
            String userId = "default-user";
            
            String result = googleCalendarService.handleCallback(code, userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", result);
            response.put("userId", userId);
            response.put("connected", true);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to handle Google OAuth callback: " + e.getMessage());
            errorResponse.put("connected", false);
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @GetMapping("/google/status")
    public ResponseEntity<Map<String, Object>> getConnectionStatus() {
        try {
            String userId = "default-user";
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
            String userId = "default-user";
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
            String userId = "default-user";
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
            String userId = "default-user";
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
