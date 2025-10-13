package com.syllabussync.controller;

import com.syllabussync.service.SyllabusParsingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;

@RestController
@RequestMapping("/api/syllabus")
@CrossOrigin(origins = "http://localhost:3000")
public class SyllabusController {

    @Autowired
    private SyllabusParsingService syllabusParsingService;

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadSyllabus(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "courseName", required = false) String courseName) {
        
        try {
            // Validate file
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Please select a file to upload"));
            }
            
            String fileName = file.getOriginalFilename();
            if (fileName == null || !isValidFileType(fileName)) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Please upload a PDF, DOCX, or TXT file"));
            }
            
            // Real PDF parsing
            List<Map<String, Object>> tasks = syllabusParsingService.parseFile(file);
            
            // If no tasks found, return helpful message
            if (tasks.isEmpty()) {
                tasks = Arrays.asList(createTask("No assignments found", "2024-12-31", "OTHER", "LOW"));
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Syllabus parsed successfully");
            response.put("fileName", fileName);
            response.put("courseName", courseName != null ? courseName : "Sample Course");
            response.put("tasksFound", tasks.size());
            response.put("tasks", tasks);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to process syllabus: " + e.getMessage()));
        }
    }
    
    @PostMapping("/generate-calendar")
    public ResponseEntity<Map<String, Object>> generateCalendar(@RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> tasks = (List<Map<String, Object>>) request.get("tasks");
            String courseName = (String) request.get("courseName");
            
            // Mock calendar generation
            String calendarUrl = generateMockCalendar(tasks, courseName);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Calendar generated successfully");
            response.put("calendarUrl", calendarUrl);
            response.put("eventsCreated", tasks.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to generate calendar: " + e.getMessage()));
        }
    }
    
    private boolean isValidFileType(String fileName) {
        String lowerCase = fileName.toLowerCase();
        return lowerCase.endsWith(".pdf") || 
               lowerCase.endsWith(".docx") || 
               lowerCase.endsWith(".txt");
    }
    
    private List<Map<String, Object>> mockParseSyllabus(String courseName) {
        List<Map<String, Object>> tasks = new ArrayList<>();
        
        // Mock extracted tasks
        tasks.add(createTask("Assignment 1: Introduction Essay", "2024-02-15", "ASSIGNMENT", "HIGH"));
        tasks.add(createTask("Midterm Exam", "2024-03-15", "EXAM", "URGENT"));
        tasks.add(createTask("Project Proposal", "2024-04-01", "PROJECT", "MEDIUM"));
        tasks.add(createTask("Final Paper", "2024-05-01", "PAPER", "HIGH"));
        tasks.add(createTask("Final Exam", "2024-05-15", "EXAM", "URGENT"));
        
        return tasks;
    }
    
    private Map<String, Object> createTask(String title, String dueDate, String type, String priority) {
        Map<String, Object> task = new HashMap<>();
        task.put("title", title);
        task.put("dueDate", dueDate);
        task.put("type", type);
        task.put("priority", priority);
        task.put("description", "Extracted from syllabus");
        return task;
    }
    
    private String generateMockCalendar(List<Map<String, Object>> tasks, String courseName) {
        // Mock calendar generation - in real implementation, this would create Google Calendar events
        return "https://calendar.google.com/calendar/embed?src=mock_calendar_id";
    }
}