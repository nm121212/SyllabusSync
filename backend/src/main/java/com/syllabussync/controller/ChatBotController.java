package com.syllabussync.controller;

import com.syllabussync.service.ChatBotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller for handling chatbot interactions
 */
@RestController
@RequestMapping("/api/chatbot")
@CrossOrigin(origins = "http://localhost:3000")
public class ChatBotController {

    @Autowired
    private ChatBotService chatBotService;

    @PostMapping("/process")
    public ResponseEntity<Map<String, Object>> processMessage(@RequestBody Map<String, String> request) {
        try {
            String message = request.get("message");
            if (message == null || message.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Message cannot be empty"
                ));
            }

            Map<String, Object> response = chatBotService.processMessage(message);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Failed to process message: " + e.getMessage()
            ));
        }
    }
}
