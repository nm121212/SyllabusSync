package com.syllabussync.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class SyllabusParsingService {

    public List<Map<String, Object>> parseFile(MultipartFile file) throws IOException {
        String fileName = file.getOriginalFilename();
        System.out.println("=== PARSING FILE: " + fileName + " ===");
        
        if (fileName == null || !fileName.toLowerCase().endsWith(".txt")) {
            System.out.println("File rejected: not a txt file");
            return new ArrayList<>();
        }
        
        String content = new String(file.getBytes());
        System.out.println("File content: [" + content + "]");
        System.out.println("Content length: " + content.length());
        
        String[] lines = content.split("\n");
        System.out.println("Number of lines: " + lines.length);
        
        List<Map<String, Object>> tasks = new ArrayList<>();
        
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            System.out.println("Line " + i + ": [" + line + "]");
            
            if (line.isEmpty()) {
                System.out.println("  -> Empty line, skipping");
                continue;
            }
            
            String title = null;
            String dateStr = null;
            
            // Try multiple parsing patterns in order of specificity
            if (line.contains(" due on ")) {
                System.out.println("  -> Found 'due on' pattern");
                String[] parts = line.split(" due on ");
                title = parts[0].trim();
                if (parts.length > 1) {
                    dateStr = parts[1].trim();
                }
            } else if (line.contains(" - Due ")) {
                System.out.println("  -> Found '- Due' pattern");
                String[] parts = line.split(" - Due ");
                title = parts[0].trim();
                if (parts.length > 1) {
                    dateStr = parts[1].trim();
                }
            } else if (line.contains(": ") && line.contains(" - Due ")) {
                System.out.println("  -> Found ': ... - Due' pattern");
                // Handle format like "Assignment 1: Hello World Program - Due 1/15/2024"
                int colonIndex = line.indexOf(": ");
                int dueIndex = line.indexOf(" - Due ");
                if (colonIndex != -1 && dueIndex != -1 && dueIndex > colonIndex) {
                    title = line.substring(0, colonIndex).trim();
                    dateStr = line.substring(dueIndex + 7).trim(); // Skip " - Due "
                }
            } else if (line.contains(" on ")) {
                System.out.println("  -> Found 'on' pattern");
                String[] parts = line.split(" on ");
                title = parts[0].trim();
                if (parts.length > 1) {
                    dateStr = parts[1].trim();
                }
            } else {
                System.out.println("  -> No pattern found");
            }
            
            System.out.println("  -> Title: [" + title + "], Date: [" + dateStr + "]");
            
            if (title != null && dateStr != null) {
                LocalDate date = parseDate(dateStr);
                System.out.println("  -> Parsed date: " + date);
                
                if (date != null) {
                    Map<String, Object> task = new HashMap<>();
                    task.put("title", title);
                    task.put("dueDate", date.toString());
                    task.put("type", getType(title));
                    task.put("priority", getPriority(title));
                    task.put("description", "Extracted from syllabus");
                    tasks.add(task);
                    System.out.println("  -> ADDED TASK: " + title);
                }
            }
        }
        
        System.out.println("=== TOTAL TASKS FOUND: " + tasks.size() + " ===");
        return tasks;
    }
    
    private LocalDate parseDate(String dateStr) {
        // List of date formats to try in order
        String[] patterns = {
            "MMMM d, yyyy",    // August 24, 2025
            "MMMM dd, yyyy",   // August 24, 2025 (with leading zero)
            "M/d/yyyy",        // 1/15/2024
            "MM/d/yyyy",       // 01/15/2024
            "M/dd/yyyy",       // 1/15/2024
            "MM/dd/yyyy",      // 01/15/2024
            "M/d/yy",          // 1/15/24
            "MM/d/yy",         // 01/15/24
            "M/dd/yy",         // 1/15/24
            "MM/dd/yy"         // 01/15/24
        };
        
        for (String pattern : patterns) {
            try {
                return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern(pattern));
            } catch (Exception e) {
                // Continue to next pattern
            }
        }
        
        System.out.println("  -> Failed to parse date: [" + dateStr + "]");
        return null;
    }
    
    private String getType(String title) {
        String lower = title.toLowerCase();
        if (lower.contains("exam")) return "EXAM";
        if (lower.contains("hw") || lower.contains("homework")) return "ASSIGNMENT";
        return "ASSIGNMENT";
    }
    
    private String getPriority(String title) {
        String lower = title.toLowerCase();
        if (lower.contains("final")) return "HIGH";
        if (lower.contains("exam")) return "HIGH";
        return "MEDIUM";
    }
}