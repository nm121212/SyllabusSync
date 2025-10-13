package com.syllabussync.service;

import org.apache.tika.Tika;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SyllabusParsingService {

    private final Tika tika = new Tika();

    private final List<Pattern> datePatterns = Arrays.asList(
        Pattern.compile("(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})"),
        Pattern.compile("(\\w+ \\d{1,2}, \\d{4})"),
        Pattern.compile("(\\w+ \\d{1,2})")
    );

    private final List<String> assignmentKeywords = Arrays.asList(
        "assignment", "homework", "hw", "project", "paper", "essay", 
        "exam", "test", "quiz", "midterm", "final", "presentation",
        "lab", "discussion", "report", "review"
    );

    public List<Map<String, Object>> parseFile(MultipartFile file) throws IOException {
        String text = extractText(file);
        return extractTasks(text);
    }

    private String extractText(MultipartFile file) throws IOException {
        try {
            return tika.parseToString(file.getInputStream());
        } catch (Exception e) {
            throw new IOException("Failed to parse file: " + e.getMessage(), e);
        }
    }

    private List<Map<String, Object>> extractTasks(String text) {
        List<Map<String, Object>> tasks = new ArrayList<>();
        String[] lines = text.split("\n");
        
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;
            
            String lowerLine = line.toLowerCase();
            for (String keyword : assignmentKeywords) {
                if (lowerLine.contains(keyword)) {
                    Map<String, Object> task = extractTaskFromLine(line, i < lines.length - 1 ? lines[i + 1] : "");
                    if (task != null) {
                        tasks.add(task);
                    }
                    break;
                }
            }
        }
        
        return tasks;
    }

    private Map<String, Object> extractTaskFromLine(String line, String nextLine) {
        String title = extractTitle(line);
        String date = extractDate(line + " " + nextLine);
        
        if (title != null && date != null) {
            Map<String, Object> task = new HashMap<>();
            task.put("title", title);
            task.put("dueDate", date);
            task.put("type", determineType(title));
            task.put("priority", determinePriority(title));
            task.put("description", "Extracted from syllabus");
            return task;
        }
        
        return null;
    }

    private String extractTitle(String line) {
        line = line.replaceAll("^\\d+\\.?\\s*", "");
        line = line.replaceAll("\\s*-\\s*", " - ");
        
        if (line.length() > 5 && line.length() < 100) {
            return line.trim();
        }
        
        return null;
    }

    private String extractDate(String text) {
        for (Pattern pattern : datePatterns) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                String dateStr = matcher.group(1);
                return normalizeDate(dateStr);
            }
        }
        return null;
    }

    private String normalizeDate(String dateStr) {
        try {
            List<DateTimeFormatter> formatters = Arrays.asList(
                DateTimeFormatter.ofPattern("M/d/yyyy"),
                DateTimeFormatter.ofPattern("M-d-yyyy"),
                DateTimeFormatter.ofPattern("M/d/yy"),
                DateTimeFormatter.ofPattern("MMMM d, yyyy"),
                DateTimeFormatter.ofPattern("MMM d, yyyy")
            );
            
            for (DateTimeFormatter formatter : formatters) {
                try {
                    LocalDate date = LocalDate.parse(dateStr, formatter);
                    return date.toString();
                } catch (DateTimeParseException ignored) {}
            }
            
            if (dateStr.matches("\\w+ \\d{1,2}")) {
                LocalDate currentDate = LocalDate.now();
                int currentYear = currentDate.getYear();
                String fullDate = dateStr + ", " + currentYear;
                try {
                    LocalDate date = LocalDate.parse(fullDate, DateTimeFormatter.ofPattern("MMMM d, yyyy"));
                    if (date.isBefore(currentDate)) {
                        date = date.plusYears(1);
                    }
                    return date.toString();
                } catch (DateTimeParseException ignored) {}
            }
            
        } catch (Exception e) {}
        
        return dateStr;
    }

    private String determineType(String title) {
        String lower = title.toLowerCase();
        
        if (lower.contains("exam") || lower.contains("test")) return "EXAM";
        if (lower.contains("quiz")) return "QUIZ";
        if (lower.contains("project")) return "PROJECT";
        if (lower.contains("paper") || lower.contains("essay")) return "PAPER";
        if (lower.contains("presentation")) return "PRESENTATION";
        if (lower.contains("lab")) return "LAB";
        if (lower.contains("discussion")) return "DISCUSSION";
        if (lower.contains("homework") || lower.contains("hw") || lower.contains("assignment")) return "ASSIGNMENT";
        
        return "OTHER";
    }

    private String determinePriority(String title) {
        String lower = title.toLowerCase();
        
        if (lower.contains("final") || lower.contains("midterm")) return "URGENT";
        if (lower.contains("exam") || lower.contains("project")) return "HIGH";
        if (lower.contains("paper") || lower.contains("presentation")) return "MEDIUM";
        
        return "LOW";
    }
}