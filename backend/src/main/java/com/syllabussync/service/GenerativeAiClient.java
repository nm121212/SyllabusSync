package com.syllabussync.service;

import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Collections;
import java.util.Objects;

/**
 * Calls Gemini either via Vertex AI (GCP billing / credits) or the consumer Gemini API (API key).
 * Vertex: either (1) Application Default Credentials (Bearer), or (2) a GCP API key restricted to Vertex AI
 * ({@code google.vertex.api-key} / {@code VERTEX_API_KEY}) appended as {@code ?key=}.
 */
@Service
public class GenerativeAiClient {

    private static final String CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${google.vertex.project-id:}")
    private String vertexProjectId;

    @Value("${google.vertex.location:us-central1}")
    private String vertexLocation;

    @Value("${google.gemini.model:gemini-2.5-flash}")
    private String model;

    @Value("${google.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${google.vertex.api-key:}")
    private String vertexApiKey;

    private volatile GoogleCredentials vertexCredentials;

    public boolean isVertexConfigured() {
        return vertexProjectId != null && !vertexProjectId.isBlank();
    }

    public boolean isApiKeyConfigured() {
        return geminiApiKey != null && !geminiApiKey.isBlank();
    }

    /**
     * True if either Vertex (project id + ADC) or consumer API key is available.
     */
    public boolean isConfigured() {
        return isVertexConfigured() || isApiKeyConfigured();
    }

    public HttpResponse<String> generateContent(String requestBodyJson) throws IOException, InterruptedException {
        if (isVertexConfigured()) {
            return callVertex(requestBodyJson);
        }
        if (isApiKeyConfigured()) {
            return callGeminiApiKey(requestBodyJson);
        }
        throw new IOException("Generative AI not configured: set GOOGLE_CLOUD_PROJECT (Vertex) or GEMINI_API_KEY");
    }

    private HttpResponse<String> callVertex(String body) throws IOException, InterruptedException {
        String url = String.format(
                "https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:generateContent",
                vertexLocation,
                vertexProjectId,
                vertexLocation,
                model);
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(appendVertexApiKeyQuery(url)))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (!hasVertexApiKey()) {
            builder.header("Authorization", "Bearer " + getVertexAccessToken());
        }
        return httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private boolean hasVertexApiKey() {
        return vertexApiKey != null && !vertexApiKey.isBlank();
    }

    /** Google Cloud API keys are passed as {@code ?key=} on REST calls (see API key docs). */
    private String appendVertexApiKeyQuery(String url) {
        if (!hasVertexApiKey()) {
            return url;
        }
        String enc = URLEncoder.encode(vertexApiKey.trim(), StandardCharsets.UTF_8);
        return url + "?key=" + enc;
    }

    private HttpResponse<String> callGeminiApiKey(String body) throws IOException, InterruptedException {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key="
                + geminiApiKey;
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private String getVertexAccessToken() throws IOException {
        GoogleCredentials creds = vertexCredentials;
        if (creds == null) {
            synchronized (this) {
                if (vertexCredentials == null) {
                    GoogleCredentials base = Objects.requireNonNull(
                            GoogleCredentials.getApplicationDefault(),
                            "Application Default Credentials not found; set GOOGLE_APPLICATION_CREDENTIALS "
                                    + "or use gcloud auth application-default login");
                    vertexCredentials = base.createScoped(Collections.singletonList(CLOUD_PLATFORM_SCOPE));
                }
                creds = vertexCredentials;
            }
        }
        creds.refreshIfExpired();
        return creds.getAccessToken().getTokenValue();
    }
}
