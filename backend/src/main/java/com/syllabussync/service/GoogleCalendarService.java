package com.syllabussync.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.auth.oauth2.StoredCredential;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.util.store.DataStore;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.EventReminder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.util.*;

@Service
public class GoogleCalendarService {

    @Value("${google.redirect-uri}")
    private String redirectUri;

    @Autowired
    private GoogleAuthorizationCodeFlow googleAuthFlow;

    @Autowired
    private NetHttpTransport httpTransport;

    @Autowired
    private JsonFactory jsonFactory;

    public String getAuthorizationUrl() {
        return googleAuthFlow.newAuthorizationUrl()
                .setRedirectUri(redirectUri)
                .build();
    }

    public String handleCallback(String code, String userId) throws IOException {
        var tokenResponse = googleAuthFlow.newTokenRequest(code)
                .setRedirectUri(redirectUri)
                .execute();

        googleAuthFlow.createAndStoreCredential(tokenResponse, userId);
        return "Calendar connected successfully";
    }

    public String createCalendarEvent(String userId, Map<String, Object> taskData) throws IOException {
        Credential credential = googleAuthFlow.loadCredential(userId);
        if (credential == null) {
            throw new IOException("User not authenticated with Google Calendar");
        }

        Calendar service = new Calendar.Builder(httpTransport, jsonFactory, credential)
                .setApplicationName("SyllabusSync")
                .build();

        Event event = new Event()
                .setSummary((String) taskData.get("title"))
                .setDescription("Course: " + taskData.get("courseName") + "\nType: " + taskData.get("type"));

        // Set due date
        String dueDateStr = (String) taskData.get("dueDate");
        LocalDate dueDate = LocalDate.parse(dueDateStr);
        
        // Create all-day event - end date should be the same as start date for all-day events
        com.google.api.client.util.DateTime startDateTime = new com.google.api.client.util.DateTime(dueDate.toString());
        com.google.api.client.util.DateTime endDateTime = new com.google.api.client.util.DateTime(dueDate.toString());

        EventDateTime start = new EventDateTime().setDate(startDateTime);
        EventDateTime end = new EventDateTime().setDate(endDateTime);
        
        event.setStart(start);
        event.setEnd(end);

        // Add reminders
        Event.Reminders reminders = new Event.Reminders()
                .setUseDefault(false)
                .setOverrides(Arrays.asList(
                        new EventReminder().setMethod("email").setMinutes(7 * 24 * 60), // 7 days
                        new EventReminder().setMethod("email").setMinutes(3 * 24 * 60), // 3 days
                        new EventReminder().setMethod("popup").setMinutes(24 * 60)      // 1 day
                ));
        event.setReminders(reminders);

        try {
            Event createdEvent = service.events().insert("primary", event).execute();
            return createdEvent.getId();
        } catch (IOException e) {
            throw mapInvalidGrant(userId, e);
        }
    }

    public boolean isUserConnected(String userId) {
        try {
            Credential credential = googleAuthFlow.loadCredential(userId);
            if (credential == null || credential.getRefreshToken() == null) {
                return false;
            }
            
            // Check if token is expired and try to refresh
            if (credential.getExpiresInSeconds() != null && credential.getExpiresInSeconds() <= 60) {
                try {
                    credential.refreshToken();
                    return true;
                } catch (IOException e) {
                    System.err.println("Failed to refresh token: " + e.getMessage());
                    if (isInvalidGrantError(e)) {
                        clearStoredCredentialQuietly(userId);
                    }
                    return false;
                }
            }
            
            return true;
        } catch (IOException e) {
            System.err.println("Error checking user connection: " + e.getMessage());
            return false;
        }
    }

    public void disconnectUser(String userId) throws IOException {
        clearStoredCredential(userId);
    }

    /** Removes local OAuth tokens so the user must sign in with Google again. */
    public void clearStoredCredential(String userId) throws IOException {
        DataStore<StoredCredential> store = googleAuthFlow.getCredentialDataStore();
        if (store != null) {
            store.delete(userId);
        }
    }

    private void clearStoredCredentialQuietly(String userId) {
        try {
            clearStoredCredential(userId);
        } catch (IOException ignored) {
            // ignore
        }
    }

    private static boolean isInvalidGrantError(Throwable t) {
        while (t != null) {
            String m = t.getMessage();
            if (m != null && m.contains("invalid_grant")) {
                return true;
            }
            t = t.getCause();
        }
        return false;
    }

    private IOException mapInvalidGrant(String userId, IOException e) {
        if (isInvalidGrantError(e)) {
            clearStoredCredentialQuietly(userId);
            return new IOException(
                    "Google Calendar session expired (invalid_grant). Open Calendar and connect Google again.", e);
        }
        return e;
    }

    public String createCalendarEventForTask(String userId, com.syllabussync.model.Task task, String courseName) throws IOException {
        Credential credential = googleAuthFlow.loadCredential(userId);
        if (credential == null) {
            throw new IOException("User not authenticated with Google Calendar");
        }

        // Ensure token is fresh
        if (credential.getExpiresInSeconds() != null && credential.getExpiresInSeconds() <= 60) {
            try {
                credential.refreshToken();
            } catch (IOException e) {
                throw mapInvalidGrant(userId, e);
            }
        }

        Calendar service = new Calendar.Builder(httpTransport, jsonFactory, credential)
                .setApplicationName("SyllabusSync")
                .build();

        Event event = new Event()
                .setSummary(task.getTitle())
                .setDescription("Course: " + courseName + "\nType: " + task.getType() + "\nPriority: " + task.getPriority() + 
                               (task.getDescription() != null ? "\nDescription: " + task.getDescription() : ""));

        // Set due date
        LocalDate dueDate = task.getDueDate();
        
        // Create all-day event - end date should be the same as start date for all-day events
        com.google.api.client.util.DateTime startDateTime = new com.google.api.client.util.DateTime(dueDate.toString());
        com.google.api.client.util.DateTime endDateTime = new com.google.api.client.util.DateTime(dueDate.toString());

        EventDateTime start = new EventDateTime().setDate(startDateTime);
        EventDateTime end = new EventDateTime().setDate(endDateTime);
        
        event.setStart(start);
        event.setEnd(end);

        // Add reminders based on task priority
        Event.Reminders reminders = new Event.Reminders()
                .setUseDefault(false);
        
        if (task.getPriority() == com.syllabussync.model.Priority.URGENT) {
            reminders.setOverrides(Arrays.asList(
                    new EventReminder().setMethod("email").setMinutes(7 * 24 * 60), // 7 days
                    new EventReminder().setMethod("email").setMinutes(3 * 24 * 60), // 3 days
                    new EventReminder().setMethod("popup").setMinutes(24 * 60),     // 1 day
                    new EventReminder().setMethod("popup").setMinutes(60)           // 1 hour
            ));
        } else if (task.getPriority() == com.syllabussync.model.Priority.HIGH) {
            reminders.setOverrides(Arrays.asList(
                    new EventReminder().setMethod("email").setMinutes(7 * 24 * 60), // 7 days
                    new EventReminder().setMethod("email").setMinutes(3 * 24 * 60), // 3 days
                    new EventReminder().setMethod("popup").setMinutes(24 * 60)      // 1 day
            ));
        } else {
            reminders.setOverrides(Arrays.asList(
                    new EventReminder().setMethod("email").setMinutes(3 * 24 * 60), // 3 days
                    new EventReminder().setMethod("popup").setMinutes(24 * 60)      // 1 day
            ));
        }
        
        event.setReminders(reminders);

        try {
            Event createdEvent = service.events().insert("primary", event).execute();
            return createdEvent.getId();
        } catch (IOException e) {
            throw mapInvalidGrant(userId, e);
        }
    }

    public Map<String, Object> getTokenInfo(String userId) {
        Map<String, Object> tokenInfo = new HashMap<>();
        try {
            Credential credential = googleAuthFlow.loadCredential(userId);
            if (credential == null) {
                tokenInfo.put("connected", false);
                tokenInfo.put("message", "No credentials found");
                return tokenInfo;
            }

            tokenInfo.put("connected", true);
            tokenInfo.put("hasRefreshToken", credential.getRefreshToken() != null);
            tokenInfo.put("expiresInSeconds", credential.getExpiresInSeconds());
            tokenInfo.put("accessToken", credential.getAccessToken() != null ? "***" + credential.getAccessToken().substring(credential.getAccessToken().length() - 4) : null);
            
            if (credential.getExpiresInSeconds() != null) {
                long expiresAt = System.currentTimeMillis() + (credential.getExpiresInSeconds() * 1000);
                tokenInfo.put("expiresAt", new java.util.Date(expiresAt));
                tokenInfo.put("needsRefresh", credential.getExpiresInSeconds() <= 300); // 5 minutes
            }
            
        } catch (IOException e) {
            tokenInfo.put("connected", false);
            tokenInfo.put("error", e.getMessage());
        }
        return tokenInfo;
    }
}
