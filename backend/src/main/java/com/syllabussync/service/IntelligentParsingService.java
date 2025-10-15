package com.syllabussync.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ExecutionException;

@Service
public class IntelligentParsingService {

    @Value("${google.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${google.gemini.model:gemini-2.5-flash}")
    private String model;

    @Value("${google.gemini.max-tokens:4096}")
    private int maxTokens;

    public Map<String, Object> parseFile(MultipartFile file) throws IOException {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            throw new RuntimeException("Gemini API key not configured");
        }
        
        // Send the PDF file directly to Gemini for parsing
        List<Map<String, Object>> tasks = extractTasksWithGeminiFromFile(file);
        String courseName = extractCourseNameFromTasks(tasks);

        Map<String, Object> result = new HashMap<>();
        result.put("courseName", courseName);
        result.put("tasks", tasks);
        return result;
    }

    private List<Map<String, Object>> extractTasksWithGeminiFromFile(MultipartFile file) {
        try {
            // Send the PDF file directly to Gemini for parsing
            String response = callGeminiAPIWithFile(file);
            return parseGeminiResponse(response);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse with Gemini: " + e.getMessage());
        }
    }

    private String extractCourseNameFromTasks(List<Map<String, Object>> tasks) {
        // Try to extract course name from the first task or use a default
        if (!tasks.isEmpty()) {
            Map<String, Object> firstTask = tasks.get(0);
            String title = (String) firstTask.get("title");
            if (title != null && title.matches(".*[A-Z]{2,4}\\s+\\d{3}.*")) {
                String[] parts = title.split("\\s+");
                if (parts.length >= 2) {
                    return parts[0] + " " + parts[1];
                }
            }
        }
        return "Unknown Course";
    }

    private String buildPrompt() {
        return """
            Analyze this syllabus document and extract all assignments, exams, projects, quizzes, and other academic tasks with their due dates.
            
            IMPORTANT DATE EXTRACTION RULES:
            - Extract dates from ANY format: "October 15, 2025", "Oct 15, 2025", "10/15/2025", "10-15-25", "15th October 2025", "Due: Oct 15", "Deadline: 10/15", etc.
            - Convert ALL dates to ISO 8601 format: YYYY-MM-DD (e.g., "2025-10-15")
            - If only month/day given, assume current year 2025
            - If only day given, try to infer month from context
            - Look for keywords: "due", "deadline", "by", "on", "before", "until"
            - Handle relative dates: "next week", "in 2 weeks", "end of semester" (convert to specific dates)
            
            Return the results as a JSON array where each task has:
            - title: The task name/title
            - description: Brief description of the task
            - dueDate: Due date in YYYY-MM-DD format (REQUIRED)
            - type: One of ASSIGNMENT, PROJECT, EXAM, QUIZ, LAB, PRESENTATION, PAPER, DISCUSSION, OTHER
            - priority: One of LOW, MEDIUM, HIGH, URGENT
            
            Return only valid JSON array, no other text.
            """;
    }

    private String callGeminiAPIWithFile(MultipartFile file) throws IOException {
        try {
            // Encode the file to base64
            String base64File = Base64.getEncoder().encodeToString(file.getBytes());
            
            // Create the request payload
            JsonObject requestPayload = new JsonObject();
            JsonArray contents = new JsonArray();
            JsonObject content = new JsonObject();
            JsonArray parts = new JsonArray();
            
            // Add text prompt
            JsonObject textPart = new JsonObject();
            textPart.addProperty("text", buildPrompt());
            parts.add(textPart);
            
            // Add file data
            JsonObject filePart = new JsonObject();
            JsonObject inlineData = new JsonObject();
            inlineData.addProperty("mime_type", file.getContentType());
            inlineData.addProperty("data", base64File);
            filePart.add("inline_data", inlineData);
            parts.add(filePart);
            
            content.add("parts", parts);
            contents.add(content);
            requestPayload.add("contents", contents);
            
            // Create HTTP request
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiApiKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(new Gson().toJson(requestPayload)))
                    .build();
            
            // Send request and get response
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() != 200) {
                throw new IOException("Gemini API returned status: " + response.statusCode() + ", body: " + response.body());
            }
            
            // Parse the response
            JsonObject responseJson = new Gson().fromJson(response.body(), JsonObject.class);
            JsonArray candidates = responseJson.getAsJsonArray("candidates");
            
            if (candidates.size() == 0) {
                throw new IOException("No candidates returned from Gemini API");
            }
            
            JsonObject candidate = candidates.get(0).getAsJsonObject();
            JsonObject contentResponse = candidate.getAsJsonObject("content");
            JsonArray partsResponse = contentResponse.getAsJsonArray("parts");
            
            if (partsResponse.size() == 0) {
                throw new IOException("No parts returned from Gemini API");
            }
            
            String responseText = partsResponse.get(0).getAsJsonObject().get("text").getAsString();
            
            // Clean up the response to ensure it's valid JSON
            responseText = responseText.trim();
            
            // Remove any markdown formatting if present
            if (responseText.startsWith("```json")) {
                responseText = responseText.substring(7);
            }
            if (responseText.endsWith("```")) {
                responseText = responseText.substring(0, responseText.length() - 3);
            }
            
            return responseText.trim();
            
        } catch (InterruptedException e) {
            throw new IOException("Failed to call Gemini API: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new IOException("Unexpected error calling Gemini API: " + e.getMessage(), e);
        }
    }

    private List<Map<String, Object>> parseGeminiResponse(String response) {
        try {
            Gson gson = new Gson();
            JsonArray jsonArray = gson.fromJson(response, JsonArray.class);
            List<Map<String, Object>> tasks = new ArrayList<>();
            
            for (JsonElement element : jsonArray) {
                JsonObject taskObj = element.getAsJsonObject();
                Map<String, Object> task = new HashMap<>();
                task.put("title", taskObj.get("title").getAsString());
                task.put("description", taskObj.get("description").getAsString());
                task.put("dueDate", taskObj.get("dueDate").getAsString());
                task.put("type", taskObj.get("type").getAsString());
                task.put("priority", taskObj.get("priority").getAsString());
                tasks.add(task);
            }
            
            return tasks;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Gemini response: " + e.getMessage());
        }
    }
}
