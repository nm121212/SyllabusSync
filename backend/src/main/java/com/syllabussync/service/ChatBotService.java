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

    @Autowired
    private GoogleCalendarService googleCalendarService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public Map<String, Object> processMessage(String message) {
        try {
            // Get current tasks to provide context to the AI
            List<Task> currentTasks = taskService.getAllTasks();
            
            // Send message to Gemini AI with task context
            String geminiResponse = callGeminiAPI(message, currentTasks);
            
            // Parse the response
            Map<String, Object> parsedResponse = parseGeminiResponse(geminiResponse);
            
            // If a task was created, add it to the system and sync to Google Calendar
            if (parsedResponse.containsKey("taskCreated")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> taskData = (Map<String, Object>) parsedResponse.get("taskCreated");
                Task createdTask = createTaskFromData(taskData);
                if (createdTask != null) {
                    taskService.saveTask(createdTask);
                    
                    // Try to sync to Google Calendar (use default user ID for now)
                    try {
                        String eventId = googleCalendarService.createCalendarEvent("default_user", Map.of(
                            "title", createdTask.getTitle(),
                            "courseName", createdTask.getCourse() != null ? createdTask.getCourse().getName() : "AI Assistant Tasks",
                            "type", createdTask.getType().toString(),
                            "dueDate", createdTask.getDueDate().toString()
                        ));
                        createdTask.setGoogleEventId(eventId);
                        taskService.saveTask(createdTask); // Save again with Google Event ID
                    } catch (Exception e) {
                        System.err.println("Failed to sync task to Google Calendar: " + e.getMessage());
                        // Don't fail the entire operation if calendar sync fails
                    }
                    
                    parsedResponse.put("taskCreated", Map.of(
                        "title", createdTask.getTitle(),
                        "dueDate", createdTask.getDueDate().toString(),
                        "type", createdTask.getType().toString(),
                        "syncedToCalendar", createdTask.getGoogleEventId() != null
                    ));
                } else {
                    // If task creation failed, provide helpful feedback
                    parsedResponse.put("response", 
                        "I'd love to help you with that! Could you give me a bit more detail? " +
                        "What's the assignment about and when is it due? I can help you plan it out and add it to your calendar.");
                    parsedResponse.remove("taskCreated");
                }
            }
            
            return parsedResponse;
        } catch (Exception e) {
            System.err.println("ChatBot error: " + e.getMessage());
            e.printStackTrace();
            return Map.of(
                "response", "Oops, I'm having a little trouble understanding that right now. " +
                          "Could you try saying it a different way? I'm here to help with your assignments and planning!"
            );
        }
    }

    private String buildPrompt(String userMessage, List<Task> currentTasks) {
        // Format current tasks for context
        String tasksContext = "";
        if (currentTasks != null && !currentTasks.isEmpty()) {
            tasksContext = "\n\nCURRENT TASKS IN YOUR DASHBOARD:\n";
            for (Task task : currentTasks) {
                tasksContext += String.format("- %s (%s) - Due: %s - %s priority\n", 
                    task.getTitle(), 
                    task.getType().toString(), 
                    task.getDueDate().toString(),
                    task.getPriority().toString());
            }
            tasksContext += "\nYou can reference these tasks when giving advice about workload, scheduling, and prioritization.\n";
        } else {
            tasksContext = "\n\nCURRENT TASKS: No tasks currently in your dashboard.\n";
        }
        
        return String.format("""
            You are a friendly, helpful AI assistant for a student task management system. You help students organize their academic life through natural conversation and can add tasks to their calendar automatically.
            
            PERSONALITY:
            - Be conversational, friendly, and encouraging like a helpful friend
            - Show enthusiasm for helping students stay organized
            - Be supportive and understanding of student life challenges
            - Give practical advice and planning suggestions
            - Ask follow-up questions to help with planning
            
            CAPABILITIES:
            1. TASK CREATION: Add tasks to calendar with automatic Google Calendar sync
            2. PLANNING ADVICE: Help students think through their schedule and workload
            3. TIME MANAGEMENT: Suggest how to break down large projects
            4. STUDY STRATEGIES: Offer tips for different types of assignments
            5. CASUAL CONVERSATION: Chat about academic life, stress, motivation, etc.
            
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
            
            DATE HANDLING (Current date is 2025-10-15):
            - Convert all dates to YYYY-MM-DD format
            - Handle relative dates: "tomorrow" = 2025-10-16, "next Friday", "in 3 days", "next week"
            - Handle absolute dates: "December 15th", "Jan 20", "3/15/2025"
            - If date is unclear, ask for clarification
            
            PLANNING SUGGESTIONS:
            - Break down large projects into smaller tasks
            - Suggest study schedules for exams
            - Recommend time blocks for different types of work
            - Help prioritize tasks based on due dates and importance
            - Suggest buffer time for unexpected delays
            
            CONVERSATION EXAMPLES:
            User: "I have a huge research paper due in 2 weeks"
            You: "That sounds like a big project! Let me help you break it down. What's the paper about? I can create a task for the final deadline and suggest some intermediate milestones to keep you on track. Research papers usually work well with a schedule like: research (3-4 days), outline (1 day), first draft (4-5 days), revision (2-3 days). What do you think?"
            
            User: "I need help I have two tests next week and dont know how to prepare"
            You: "Oh wow, two tests in one week - that's definitely a lot to handle! I can see you already have some assignments coming up too. Let's break this down and make a plan. What subjects are the tests in? And do you know what topics they'll cover? I can help you create a study schedule that works around your existing assignments. Usually for tests, I recommend starting with the harder subject first and doing shorter, focused study sessions rather than cramming."
            
            User: "How should I prioritize my work this week?"
            You: "Looking at your current tasks, I can see you have [reference specific tasks]. Let me help you prioritize! I'd suggest tackling the [URGENT/HIGH priority] tasks first, especially [specific task name] since it's due [date]. Then you can work on [other tasks]. Does this sound like a good plan, or do you want to adjust anything?"
            
            User: "Add a math homework due next Friday"
            You: "Sure thing! I'll add that math homework to your calendar for next Friday. What's the assignment about? And hey, since it's due next Friday, you might want to start working on it by Wednesday to give yourself some buffer time. Math homework can sometimes take longer than expected!"
            
            User: "I'm feeling overwhelmed with all my assignments"
            You: "I totally get that feeling! Let's take a step back and organize things. Can you tell me what assignments you have coming up? I can help you prioritize them and create a manageable schedule. Sometimes just getting everything written down and organized can make a huge difference in how overwhelming it feels."
            
            User: "Hi, how are you?"
            You: "Hi there! I'm doing great, thanks for asking! I'm here and ready to help you organize your academic life. How are you doing? Any assignments or projects you're working on that I can help you plan for?"
            
            User: "what"
            You: "Hey! I'm here to help with your school stuff. Are you looking to add a task to your calendar, or do you need help planning something out? Just let me know what's on your mind!"
            
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
            - If the user is just chatting, asking for advice, or having a conversation, only include the "response" field
            - Always be helpful, encouraging, and conversational
            - Offer planning suggestions and study tips when appropriate
            - Make the response feel natural and supportive
            - Don't be overly formal - be like a helpful friend
            - For study planning questions, focus on giving helpful advice and asking follow-up questions
            - Don't default to formal task creation messages - be flexible and conversational
            - If someone asks for help with planning or studying, engage in conversation first
            - Use the current tasks information to give personalized advice about workload and scheduling
            - Reference specific tasks when relevant to help with prioritization and planning
            
            %s
            
            Current user message: %s
            """, tasksContext, userMessage);
    }

    private String callGeminiAPI(String message, List<Task> currentTasks) throws IOException, InterruptedException {
        String prompt = buildPrompt(message, currentTasks);
        
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
                        
                        // Clean up the text - remove markdown code blocks if present
                        String cleanText = text.trim();
                        if (cleanText.startsWith("```json") && cleanText.endsWith("```")) {
                            cleanText = cleanText.substring(7, cleanText.length() - 3).trim();
                        } else if (cleanText.startsWith("```") && cleanText.endsWith("```")) {
                            cleanText = cleanText.substring(3, cleanText.length() - 3).trim();
                        }
                        
                        // Try to parse as JSON first
                        try {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> result = objectMapper.readValue(cleanText, Map.class);
                            return result;
                        } catch (Exception e) {
                            // If not JSON, treat as plain text response
                            return Map.of("response", cleanText);
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
