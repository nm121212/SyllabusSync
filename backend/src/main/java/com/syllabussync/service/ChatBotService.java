package com.syllabussync.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.syllabussync.model.Task;
import com.syllabussync.model.TaskType;
import com.syllabussync.model.Priority;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Service for handling chatbot interactions using Gemini AI
 */
@Service
public class ChatBotService {

    @Value("${GEMINI_API_KEY}")
    private String geminiApiKey;

    @Autowired
    private TaskService taskService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public Map<String, Object> processMessage(String message) {
        try {
            // Send message to Gemini AI
            String geminiResponse = callGeminiAPI(message);
            
            // Parse the response
            Map<String, Object> parsedResponse = parseGeminiResponse(geminiResponse);
            
            // If a task was created, add it to the system
            if (parsedResponse.containsKey("taskCreated")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> taskData = (Map<String, Object>) parsedResponse.get("taskCreated");
                Task createdTask = createTaskFromData(taskData);
                if (createdTask != null) {
                    taskService.saveTask(createdTask);
                    parsedResponse.put("taskCreated", Map.of(
                        "title", createdTask.getTitle(),
                        "dueDate", createdTask.getDueDate().toString(),
                        "type", createdTask.getType().toString()
                    ));
                } else {
                    // If task creation failed, provide helpful feedback
                    parsedResponse.put("response", 
                        "I understood you want to create a task, but I need a bit more information. " +
                        "Could you please specify the task title, due date, and what type of assignment it is? " +
                        "For example: 'Add a history paper due next Friday' or 'Create a math homework due tomorrow'.");
                    parsedResponse.remove("taskCreated");
                }
            }
            
            return parsedResponse;
        } catch (Exception e) {
            System.err.println("ChatBot error: " + e.getMessage());
            e.printStackTrace();
            return Map.of(
                "response", "I'm sorry, I'm having trouble processing your request right now. " +
                          "Could you try rephrasing your message? For example, you could say: " +
                          "'Add a task: [task name] due [date]' or 'I need to [task description] by [date]'."
            );
        }
    }

    private String callGeminiAPI(String message) throws IOException, InterruptedException {
        String prompt = buildPrompt(message);
        
        String requestBody = String.format("""
            {
                "contents": [{
                    "parts": [{
                        "text": "%s"
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 1024
                }
            }
            """, prompt.replace("\"", "\\\""));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + geminiApiKey))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() != 200) {
            throw new RuntimeException("Gemini API error: " + response.body());
        }
        
        return response.body();
    }

    private String buildPrompt(String userMessage) {
        return String.format("""
            You are a friendly, helpful AI assistant for a student task management system called SyllabusSync. You help students organize their academic life by adding tasks to their calendar through natural conversation.
            
            PERSONALITY:
            - Be conversational, friendly, and encouraging
            - Show enthusiasm for helping students stay organized
            - Ask clarifying questions when needed
            - Provide helpful suggestions and tips
            - Be supportive and understanding of student life challenges
            
            TASK CREATION CAPABILITIES:
            When a user wants to add a task, you can:
            1. Extract task details from natural language
            2. Ask for clarification if information is missing
            3. Suggest appropriate task types and priorities
            4. Help with date interpretation and scheduling
            
            TASK TYPES (choose the most appropriate):
            - ASSIGNMENT: Homework, worksheets, problem sets
            - PROJECT: Long-term assignments, group projects, research projects
            - EXAM: Tests, midterms, finals, quizzes
            - QUIZ: Short tests, pop quizzes, online quizzes
            - LAB: Laboratory work, experiments, lab reports
            - PRESENTATION: Oral presentations, speeches, demos
            - PAPER: Essays, research papers, written assignments
            - DISCUSSION: Class discussions, forum posts, participation
            - OTHER: Anything that doesn't fit the above categories
            
            PRIORITY LEVELS:
            - URGENT: Due within 1-2 days, critical assignments
            - HIGH: Due within 3-7 days, important assignments
            - MEDIUM: Due within 1-2 weeks, regular assignments
            - LOW: Due in more than 2 weeks, less urgent items
            
            DATE HANDLING:
            - Convert all dates to YYYY-MM-DD format
            - If no year is specified, assume 2025
            - Handle relative dates: "tomorrow", "next Friday", "in 3 days", "next week"
            - Handle absolute dates: "December 15th", "Jan 20", "3/15/2025"
            - If date is unclear, ask for clarification
            
            CONVERSATION EXAMPLES:
            User: "I need to finish my music report due tomorrow for history of jazz"
            You: "I'd be happy to help you add that task! I can see you have a music report for History of Jazz due tomorrow. Let me add that to your calendar right away."
            
            User: "Add a math homework due next Friday"
            You: "Got it! I'll add your math homework to your calendar for next Friday. What's the specific assignment about?"
            
            User: "I have a big project coming up"
            You: "I'd love to help you organize that project! Can you tell me more details? What's the project about, when is it due, and what type of project is it?"
            
            RESPONSE FORMAT:
            Your response must be in this exact JSON format:
            {
                "response": "Your conversational response message here",
                "taskCreated": {
                    "title": "Task title",
                    "dueDate": "YYYY-MM-DD",
                    "type": "TASK_TYPE",
                    "priority": "LOW|MEDIUM|HIGH|URGENT"
                }
            }
            
            RULES:
            - If the user is asking to create a task, include both "response" and "taskCreated" fields
            - If the user is just chatting or asking questions, only include the "response" field
            - Always be helpful and encouraging
            - If information is missing, ask for clarification in a friendly way
            - Make the response feel natural and conversational
            
            Current user message: %s
            """, userMessage);
    }

    private Map<String, Object> parseGeminiResponse(String geminiResponse) {
        try {
            JsonNode rootNode = objectMapper.readTree(geminiResponse);
            JsonNode candidatesNode = rootNode.get("candidates");
            
            if (candidatesNode != null && candidatesNode.isArray() && candidatesNode.size() > 0) {
                JsonNode contentNode = candidatesNode.get(0).get("content");
                if (contentNode != null) {
                    JsonNode partsNode = contentNode.get("parts");
                    if (partsNode != null && partsNode.isArray() && partsNode.size() > 0) {
                        String text = partsNode.get(0).get("text").asText();
                        
                        // Try to parse as JSON first
                        try {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> result = objectMapper.readValue(text, Map.class);
                            return result;
                        } catch (Exception e) {
                            // If not JSON, treat as plain text response
                            return Map.of("response", text);
                        }
                    }
                }
            }
            
            return Map.of("response", "I'm sorry, I couldn't process your request. Please try again.");
        } catch (Exception e) {
            return Map.of("response", "I'm sorry, I encountered an error. Please try again.");
        }
    }

    private Task createTaskFromData(Map<String, Object> taskData) {
        try {
            String title = (String) taskData.get("title");
            String dueDateStr = (String) taskData.get("dueDate");
            String typeStr = (String) taskData.get("type");
            String priorityStr = (String) taskData.getOrDefault("priority", "MEDIUM");
            
            if (title == null || dueDateStr == null || typeStr == null) {
                return null;
            }
            
            LocalDate dueDate = parseDate(dueDateStr);
            TaskType type = parseTaskType(typeStr);
            Priority priority = parsePriority(priorityStr);
            
            Task task = new Task();
            task.setTitle(title);
            task.setDueDate(dueDate);
            task.setType(type);
            task.setPriority(priority);
            task.setStatus(com.syllabussync.model.TaskStatus.PENDING);
            task.setDescription("Created by AI Assistant");
            
            return task;
        } catch (Exception e) {
            return null;
        }
    }

    private LocalDate parseDate(String dateStr) {
        // Handle relative dates first
        LocalDate relativeDate = parseRelativeDate(dateStr);
        if (relativeDate != null) {
            return relativeDate;
        }
        
        try {
            return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        } catch (DateTimeParseException e) {
            // Try other common formats
            String[] formats = {
                "MM/dd/yyyy", "M/d/yyyy", "MM-dd-yyyy", "M-d-yyyy",
                "yyyy/MM/dd", "yyyy-M-d", "MMM d, yyyy", "MMMM d, yyyy",
                "MMM d", "MMMM d", "d MMM", "d MMMM"
            };
            
            for (String format : formats) {
                try {
                    LocalDate parsed = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern(format));
                    // If year is 1970 (default), assume current year
                    if (parsed.getYear() == 1970) {
                        parsed = parsed.withYear(2025);
                    }
                    return parsed;
                } catch (DateTimeParseException ignored) {
                    // Continue to next format
                }
            }
            
            throw new DateTimeParseException("Unable to parse date: " + dateStr, dateStr, 0);
        }
    }

    private LocalDate parseRelativeDate(String dateStr) {
        String lowerDateStr = dateStr.toLowerCase().trim();
        LocalDate today = LocalDate.now();
        
        switch (lowerDateStr) {
            case "today":
                return today;
            case "tomorrow":
                return today.plusDays(1);
            case "yesterday":
                return today.minusDays(1);
            case "next week":
                return today.plusWeeks(1);
            case "next month":
                return today.plusMonths(1);
            default:
                // Handle "in X days" format
                if (lowerDateStr.startsWith("in ") && lowerDateStr.endsWith(" days")) {
                    try {
                        int days = Integer.parseInt(lowerDateStr.replace("in ", "").replace(" days", ""));
                        return today.plusDays(days);
                    } catch (NumberFormatException e) {
                        // Ignore and return null
                    }
                }
                // Handle "in X weeks" format
                if (lowerDateStr.startsWith("in ") && lowerDateStr.endsWith(" weeks")) {
                    try {
                        int weeks = Integer.parseInt(lowerDateStr.replace("in ", "").replace(" weeks", ""));
                        return today.plusWeeks(weeks);
                    } catch (NumberFormatException e) {
                        // Ignore and return null
                    }
                }
                // Handle "next [day of week]" format
                if (lowerDateStr.startsWith("next ")) {
                    String dayOfWeek = lowerDateStr.replace("next ", "");
                    return parseNextDayOfWeek(dayOfWeek, today);
                }
                return null;
        }
    }

    private LocalDate parseNextDayOfWeek(String dayOfWeek, LocalDate today) {
        java.time.DayOfWeek targetDay;
        switch (dayOfWeek.toLowerCase()) {
            case "monday": targetDay = java.time.DayOfWeek.MONDAY; break;
            case "tuesday": targetDay = java.time.DayOfWeek.TUESDAY; break;
            case "wednesday": targetDay = java.time.DayOfWeek.WEDNESDAY; break;
            case "thursday": targetDay = java.time.DayOfWeek.THURSDAY; break;
            case "friday": targetDay = java.time.DayOfWeek.FRIDAY; break;
            case "saturday": targetDay = java.time.DayOfWeek.SATURDAY; break;
            case "sunday": targetDay = java.time.DayOfWeek.SUNDAY; break;
            default: return null;
        }
        
        LocalDate nextDay = today;
        while (nextDay.getDayOfWeek() != targetDay) {
            nextDay = nextDay.plusDays(1);
        }
        return nextDay;
    }

    private TaskType parseTaskType(String typeStr) {
        try {
            return TaskType.valueOf(typeStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return TaskType.OTHER;
        }
    }

    private Priority parsePriority(String priorityStr) {
        try {
            return Priority.valueOf(priorityStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Priority.MEDIUM;
        }
    }
}
