package com.syllabussync.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.syllabussync.security.CurrentUserResolver;
import com.syllabussync.service.ChatBotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Chatbot endpoints. Every request is scoped to the signed-in Supabase user
 * so the AI sees only that user's tasks and writes new tasks/events into
 * their calendar — no more shared "default-user" context.
 */
@RestController
@RequestMapping("/api/chatbot")
public class ChatBotController {

    @Autowired
    private ChatBotService chatBotService;

    @Autowired
    private CurrentUserResolver currentUserResolver;

    @PostMapping("/process")
    public ResponseEntity<Map<String, Object>> processMessage(@RequestBody(required = false) JsonNode request) {
        try {
            if (request == null || !request.isObject()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid request body"));
            }

            String message = asText(request.get("message"));
            if (message == null || message.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Message cannot be empty"));
            }
            List<Map<String, String>> history = normalizeHistory(request.get("history"));

            String userId = currentUserResolver.requireUserId();
            Map<String, Object> response = chatBotService.processMessage(userId, message, history);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Failed to process message: " + e.getMessage()
            ));
        }
    }

    private static List<Map<String, String>> normalizeHistory(JsonNode historyNode) {
        if (historyNode == null || !historyNode.isArray()) {
            return List.of();
        }

        List<Map<String, String>> history = new ArrayList<>();
        for (JsonNode item : historyNode) {
            if (item == null || !item.isObject()) {
                continue;
            }
            String role = asText(item.get("role"));
            String text = firstNonBlank(
                    asText(item.get("text")),
                    asText(item.get("content")),
                    asText(item.get("message"))
            );
            if (text == null || text.isBlank()) {
                continue;
            }
            Map<String, String> entry = new HashMap<>();
            entry.put("role", role != null ? role : "user");
            entry.put("text", text);
            history.add(entry);
        }
        return history;
    }

    private static String asText(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        return node.isTextual() ? node.asText() : node.toString();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
