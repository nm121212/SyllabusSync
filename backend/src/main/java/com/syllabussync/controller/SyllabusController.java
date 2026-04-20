package com.syllabussync.controller;

import com.syllabussync.security.CurrentUser;
import com.syllabussync.security.CurrentUserResolver;
import com.syllabussync.security.OAuthStateCodec;
import com.syllabussync.service.IntelligentParsingService;
import com.syllabussync.service.SyllabusParsingService;
import com.syllabussync.service.GoogleCalendarService;
import com.syllabussync.service.TaskService;
import com.syllabussync.model.Task;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api/syllabus")
public class SyllabusController {

    @Autowired
    private IntelligentParsingService intelligentParsingService;
    
    @Autowired
    private SyllabusParsingService syllabusParsingService;
    
    @Autowired
    private GoogleCalendarService googleCalendarService;
    
    @Autowired
    private TaskService taskService;

    @Autowired
    private CurrentUserResolver currentUserResolver;

    @Autowired
    private OAuthStateCodec oAuthStateCodec;

    @Value("${app.google.calendar.oauth-success-redirect:http://localhost:3000/settings}")
    private String calendarOauthSuccessRedirect;
    
    // Google Calendar OAuth endpoints
    @GetMapping("/auth/google/url")
    public ResponseEntity<Map<String, Object>> getGoogleAuthUrl() {
        try {
            String userId = currentUserResolver.requireUserId();
            String state = oAuthStateCodec.encode(userId);
            String authUrl = googleCalendarService.getAuthorizationUrl(state);
            return ResponseEntity.ok(Map.of("authUrl", authUrl));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to generate auth URL: " + e.getMessage()));
        }
    }
    
    @GetMapping("/auth/google/callback")
    public ResponseEntity<Void> handleGoogleCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String oauthError,
            @RequestParam(value = "error_description", required = false) String errorDescription) {
        String base = calendarOauthSuccessRedirect;
        try {
            if (oauthError != null && !oauthError.isBlank()) {
                String msg = (errorDescription != null && !errorDescription.isBlank()) ? errorDescription : oauthError;
                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(base + "?calendar_error=" + URLEncoder.encode(msg, StandardCharsets.UTF_8)))
                        .build();
            }
            if (code == null || code.isBlank()) {
                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(base + "?calendar_error="
                                + URLEncoder.encode("missing authorization code", StandardCharsets.UTF_8)))
                        .build();
            }
            // The user id is carried in the signed `state` param — we refuse to
            // continue without it so we never write credentials under the wrong
            // bucket (the previous shared "default-user" was the root-cause of
            // the cross-user leak).
            String userId = oAuthStateCodec.decode(state);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(base + "?calendar_error="
                                + URLEncoder.encode("Session expired - please sign in and try again.", StandardCharsets.UTF_8)))
                        .build();
            }
            googleCalendarService.handleCallback(code, userId);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(base + "?calendar_connected=1"))
                    .build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(base + "?calendar_error="
                            + URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8)))
                    .build();
        }
    }
    
    @GetMapping("/calendar/status")
    public ResponseEntity<Map<String, Object>> getCalendarStatus() {
        try {
            CurrentUser u = currentUserResolver.currentUserOrNull();
            if (u == null) {
                return ResponseEntity.ok(Map.of("connected", false));
            }
            boolean isConnected = googleCalendarService.isUserConnected(u.supabaseUserId());
            return ResponseEntity.ok(Map.of("connected", isConnected));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to check calendar status: " + e.getMessage()));
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadSyllabus(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "courseName", required = false) String courseName) {
        
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "File is empty"));
            }
            
            if (!isValidFileType(file.getOriginalFilename())) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Unsupported file type. Please upload a PDF, DOCX, or TXT file."));
            }
            
            // Try intelligent parsing first, fallback to simple parsing if API key not available
            Map<String, Object> parseResult;
            String parsingMethod;
            
            try {
                parseResult = intelligentParsingService.parseFile(file);
                parsingMethod = "intelligent";
            } catch (Exception e) {
                if (e.getMessage().contains("Gemini API key not configured")) {
                    // Fallback to simple parsing
                    List<Map<String, Object>> tasks = syllabusParsingService.parseFile(file);
                    parseResult = new HashMap<>();
                    parseResult.put("tasks", tasks);
                    parseResult.put("courseName", courseName != null ? courseName : "Unknown Course");
                    parsingMethod = "simple";
                } else {
                    throw e; // Re-throw other exceptions
                }
            }
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> tasks = (List<Map<String, Object>>) parseResult.get("tasks");
            String extractedCourseName = (String) parseResult.get("courseName");
            String finalCourseName = courseName != null ? courseName : extractedCourseName;
            
            // Store the tasks in TaskService (no automatic calendar sync).
            // Scoped to the authenticated Supabase user so different students
            // never mix syllabi.
            String userId = currentUserResolver.requireUserId();
            List<Task> savedTasks = taskService.createTasksFromParsedData(userId, tasks, finalCourseName);
            
            Map<String, Object> response = new HashMap<>();
            response.put("fileName", file.getOriginalFilename());
            response.put("courseName", finalCourseName);
            response.put("tasksFound", tasks.size());
            response.put("tasksSaved", savedTasks.size());
            response.put("tasks", tasks);
            response.put("message", tasks.isEmpty() ? "No tasks found in syllabus" : 
                "Syllabus parsed successfully with " + (parsingMethod.equals("intelligent") ? "AI" : "simple parsing") + 
                " and " + savedTasks.size() + " tasks saved to dashboard");
            response.put("parsingMethod", parsingMethod);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to parse syllabus: " + e.getMessage());
            errorResponse.put("fileName", file.getOriginalFilename());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    @PostMapping("/generate-calendar")
    public ResponseEntity<Map<String, Object>> generateCalendar(
            @RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> taskMaps = (List<Map<String, Object>>) request.get("tasks");
            String courseName = (String) request.get("courseName");
            String userId = currentUserResolver.requireUserId();

            if (!googleCalendarService.isUserConnected(userId)) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Please connect your Google Calendar first"));
            }

            for (Map<String, Object> taskMap : taskMaps) {
                taskMap.put("courseName", courseName);
            }

            List<String> eventIds = new ArrayList<>();
            for (Map<String, Object> taskMap : taskMaps) {
                try {
                    String eventId = googleCalendarService.createCalendarEvent(userId, taskMap);
                    eventIds.add(eventId);
                } catch (IOException e) {
                    System.err.println("Failed to create calendar event: " + e.getMessage());
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Calendar events created successfully");
            response.put("eventsCreated", eventIds.size());
            response.put("eventIds", eventIds);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to create calendar events: " + e.getMessage()));
        }
    }
    
    @GetMapping("/tasks")
    public ResponseEntity<List<Map<String, Object>>> getAllTasks() {
        try {
            // When the caller isn't authenticated (e.g. the landing page hero
            // probing for stats before sign-in) we return an empty list rather
            // than 401ing so the UI can render its honest empty state.
            CurrentUser u = currentUserResolver.currentUserOrNull();
            if (u == null) {
                return ResponseEntity.ok(List.of());
            }
            List<Task> tasks = taskService.getAllTasks(u.supabaseUserId());
            return ResponseEntity.ok(convertTasksToMap(tasks));
        } catch (Exception e) {
            System.err.println("Error getting tasks: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PutMapping("/tasks/{taskId}")
    public ResponseEntity<Map<String, Object>> updateTask(
            @PathVariable Long taskId,
            @RequestBody Map<String, Object> updates) {
        try {
            String userId = currentUserResolver.requireUserId();
            Task updatedTask = taskService.updateTask(userId, taskId, updates);

            // NOTE: `Map.of(...)` is null-hostile and was throwing NPEs for
            // tasks without a description or a due date, which made every
            // "mark done" click fail silently from the frontend's view.
            // A plain HashMap accepts nulls and preserves the intent.
            Map<String, Object> taskPayload = new HashMap<>();
            taskPayload.put("id", updatedTask.getId());
            taskPayload.put("title", updatedTask.getTitle());
            taskPayload.put("description", updatedTask.getDescription());
            // NOTE: use .name() not .toString() - these enums override
            // toString() to return the human display name ("Completed"),
            // which breaks the frontend's status check
            // (`t.status === 'COMPLETED'`) and makes "mark done" look
            // like it does nothing.
            taskPayload.put(
                "status",
                updatedTask.getStatus() != null ? updatedTask.getStatus().name() : null
            );
            taskPayload.put(
                "priority",
                updatedTask.getPriority() != null ? updatedTask.getPriority().name() : null
            );
            taskPayload.put(
                "type",
                updatedTask.getType() != null ? updatedTask.getType().name() : null
            );
            taskPayload.put(
                "dueDate",
                updatedTask.getDueDate() != null ? updatedTask.getDueDate().toString() : null
            );

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Task updated successfully");
            response.put("task", taskPayload);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error updating task: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<Map<String, Object>> deleteTask(
            @PathVariable Long taskId) {
        try {
            taskService.deleteTask(currentUserResolver.requireUserId(), taskId);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Task deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error deleting task: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    @DeleteMapping("/tasks")
    public ResponseEntity<Map<String, Object>> deleteAllTasks() {
        try {
            taskService.deleteAllTasks(currentUserResolver.requireUserId());
            Map<String, Object> response = new HashMap<>();
            response.put("message", "All tasks deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error deleting all tasks: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PostMapping("/tasks/{taskId}/sync-calendar")
    public ResponseEntity<Map<String, Object>> syncTaskToCalendar(@PathVariable Long taskId) {
        try {
            String userId = currentUserResolver.requireUserId();
            List<Task> allTasks = taskService.getAllTasks(userId);
            Task task = allTasks.stream()
                    .filter(t -> t.getId().equals(taskId))
                    .findFirst()
                    .orElse(null);

            if (task == null) {
                return ResponseEntity.notFound().build();
            }

            if (!googleCalendarService.isUserConnected(userId)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Google Calendar not connected. Please connect your calendar first."));
            }

            String courseName = task.getCourse() != null ? task.getCourse().getCourseName() : "Unknown Course";
            String eventId = googleCalendarService.createCalendarEventForTask(userId, task, courseName);

            Map<String, Object> updates = new HashMap<>();
            updates.put("googleEventId", eventId);
            taskService.updateTask(userId, taskId, updates);
            
            return ResponseEntity.ok(Map.of(
                "message", "Task synced to Google Calendar successfully",
                "eventId", eventId,
                "taskId", taskId
            ));
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to sync task to calendar: " + e.getMessage()));
        }
    }
    
    @PostMapping("/tasks/sync-all-calendar")
    public ResponseEntity<Map<String, Object>> syncAllTasksToCalendar() {
        try {
            String userId = currentUserResolver.requireUserId();
            if (!googleCalendarService.isUserConnected(userId)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Google Calendar not connected. Please connect your calendar first."));
            }

            List<Task> allTasks = taskService.getAllTasks(userId);
            int syncedCount = 0;
            int failedCount = 0;
            List<String> errors = new ArrayList<>();

            for (Task task : allTasks) {
                try {
                    if (task.getGoogleEventId() != null && !task.getGoogleEventId().isEmpty()) {
                        continue;
                    }

                    String courseName = task.getCourse() != null ? task.getCourse().getCourseName() : "Unknown Course";
                    String eventId = googleCalendarService.createCalendarEventForTask(userId, task, courseName);

                    Map<String, Object> updates = new HashMap<>();
                    updates.put("googleEventId", eventId);
                    taskService.updateTask(userId, task.getId(), updates);
                    
                    syncedCount++;
                } catch (Exception e) {
                    failedCount++;
                    errors.add("Task '" + task.getTitle() + "': " + e.getMessage());
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Calendar sync completed");
            response.put("syncedCount", syncedCount);
            response.put("failedCount", failedCount);
            response.put("totalTasks", allTasks.size());
            
            if (!errors.isEmpty()) {
                response.put("errors", errors);
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to sync tasks to calendar: " + e.getMessage()));
        }
    }
    
    @PostMapping("/tasks/batch")
    public ResponseEntity<Map<String, Object>> saveTasks(
            @RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> taskMaps = (List<Map<String, Object>>) request.get("tasks");
            String courseName = (String) request.get("courseName");
            
            String userId = currentUserResolver.requireUserId();
            List<Task> savedTasks = taskService.createTasksFromParsedData(userId, taskMaps, courseName);
            
            return ResponseEntity.ok(Map.of(
                "message", "Tasks saved successfully",
                "tasksSaved", savedTasks.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to save tasks: " + e.getMessage()));
        }
    }
    
    
    private boolean isValidFileType(String fileName) {
        if (fileName == null) {
            return false;
        }
        String lowerCase = fileName.toLowerCase();
        return lowerCase.endsWith(".pdf") || 
               lowerCase.endsWith(".docx") || 
               lowerCase.endsWith(".txt");
    }
    
    private List<Map<String, Object>> convertTasksToMap(List<Task> tasks) {
        return tasks.stream().map(task -> {
            Map<String, Object> taskMap = new HashMap<>();
            taskMap.put("id", task.getId());
            taskMap.put("title", task.getTitle());
            taskMap.put("description", task.getDescription());
            taskMap.put(
                "dueDate",
                task.getDueDate() != null ? task.getDueDate().toString() : null
            );
            // Use .name() for enums - the model enums override toString()
            // to return display names ("Completed", "High", "Assignment"),
            // but the frontend filters/labels by the canonical enum names
            // (COMPLETED, HIGH, ASSIGNMENT). Mixing the two was why "mark
            // done" silently rolled back in the UI.
            taskMap.put("type", task.getType() != null ? task.getType().name() : null);
            taskMap.put(
                "priority",
                task.getPriority() != null ? task.getPriority().name() : null
            );
            taskMap.put(
                "status",
                task.getStatus() != null ? task.getStatus().name() : null
            );
            // Safely get course name
            String courseName = "Unknown Course";
            try {
                if (task.getCourse() != null) {
                    courseName = task.getCourse().getName();
                }
            } catch (Exception e) {
                System.err.println("Error getting course name for task " + task.getId() + ": " + e.getMessage());
            }
            taskMap.put("courseName", courseName);
            return taskMap;
        }).toList();
    }
}