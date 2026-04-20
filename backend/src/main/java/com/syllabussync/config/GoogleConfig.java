package com.syllabussync.config;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.List;

@Configuration
public class GoogleConfig {

    @Value("${google.client-id}")
    private String clientId;

    @Value("${google.client-secret}")
    private String clientSecret;

    @Value("${google.redirect-uri:http://localhost:8080/api/syllabus/auth/google/callback}")
    private String redirectUri;

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

    /**
     * Explicit URLs - Events.Insert needs calendar write access (not calendar.readonly).
     * Must match scopes added under OAuth consent screen → Data access / Scopes in Google Cloud Console.
     */
    private static final List<String> SCOPES = Arrays.asList(
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile"
    );

    @Bean
    public NetHttpTransport httpTransport() throws GeneralSecurityException, IOException {
        return GoogleNetHttpTransport.newTrustedTransport();
    }

    @Bean
    public JsonFactory jsonFactory() {
        return JSON_FACTORY;
    }

    @Value("${app.google.credentials-dir:}")
    private String credentialsDir;

    @Bean
    public GoogleAuthorizationCodeFlow googleAuthFlow(NetHttpTransport httpTransport) throws IOException {
        GoogleClientSecrets.Details details = new GoogleClientSecrets.Details();
        details.setClientId(clientId);
        details.setClientSecret(clientSecret);

        GoogleClientSecrets clientSecrets = new GoogleClientSecrets();
        clientSecrets.setWeb(details);

        // Each user's tokens land in this directory, keyed by the Supabase
        // `sub`. Configurable via APP_GOOGLE_CREDENTIALS_DIR so Render can
        // pin it next to the tasks data volume; defaults to a subdirectory
        // of the user's home so dev + containers still work unchanged.
        File dataStoreDir = (credentialsDir != null && !credentialsDir.isBlank())
                ? new File(credentialsDir)
                : new File(System.getProperty("user.home"), ".credentials/syllabussync");
        if (!dataStoreDir.exists() && !dataStoreDir.mkdirs()) {
            // mkdir failure isn't fatal — the FileDataStoreFactory will
            // surface a more specific error when it actually tries to
            // write — but log so Render deploys surface misconfigurations
            // loudly.
            System.err.println("WARN: could not create credentials dir: " + dataStoreDir.getAbsolutePath());
        }
        FileDataStoreFactory dataStoreFactory = new FileDataStoreFactory(dataStoreDir);

        return new GoogleAuthorizationCodeFlow.Builder(
                httpTransport, JSON_FACTORY, clientSecrets, SCOPES)
                .setDataStoreFactory(dataStoreFactory)
                .setAccessType("offline")
                .setApprovalPrompt("force")
                .build();
    }
}
