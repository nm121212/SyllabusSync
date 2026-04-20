package com.syllabussync.controller;

import com.syllabussync.security.CurrentUserResolver;
import com.syllabussync.service.ChatBotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<Map<String, Object>> processMessage(@RequestBody Map<String, String> request) {
        try {
            String message = request.get("message");
            if (message == null || message.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Message cannot be empty"
                ));
            }

            String userId = currentUserResolver.requireUserId();
            Map<String, Object> response = chatBotService.processMessage(userId, message);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Failed to process message: " + e.getMessage()
            ));
        }
    }
}
