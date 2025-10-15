package com.syllabussync.service;

import com.syllabussync.model.Task;
import com.syllabussync.model.Course;
import com.syllabussync.model.TaskType;
import com.syllabussync.model.Priority;
import com.syllabussync.model.TaskStatus;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TaskService {

    // File-based persistence for tasks
    private final Map<String, List<Task>> tasksByCourse = new ConcurrentHashMap<>();
    private final Map<Long, Task> allTasks = new ConcurrentHashMap<>();
    private long nextTaskId = 1;
    
    private final ObjectMapper objectMapper;
    private final Path tasksFilePath = Paths.get("tasks.json");
    private final Path coursesFilePath = Paths.get("courses.json");
    
    public TaskService() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        // Configure to ignore unknown properties during deserialization
        this.objectMapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        // Configure to write dates as strings instead of arrays
        this.objectMapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        loadTasksFromFile();
    }

    public List<Task> createTasksFromParsedData(List<Map<String, Object>> parsedTasks, String courseName) {
        List<Task> tasks = new ArrayList<>();
        
        // Create or get course
        Course course = getOrCreateCourse(courseName);
        
        for (Map<String, Object> taskData : parsedTasks) {
            Task task = new Task();
            task.setId(nextTaskId++);
            task.setTitle((String) taskData.get("title"));
            task.setDescription((String) taskData.get("description"));
            task.setDueDate(parseDate((String) taskData.get("dueDate")));
            
            String typeStr = (String) taskData.get("type");
            TaskType taskType;
            try {
                taskType = TaskType.valueOf(typeStr);
            } catch (IllegalArgumentException e) {
                taskType = TaskType.OTHER;
            }
            task.setType(taskType);
            
            String priorityStr = (String) taskData.get("priority");
            Priority priority;
            try {
                priority = Priority.valueOf(priorityStr);
            } catch (IllegalArgumentException e) {
                priority = Priority.MEDIUM;
            }
            task.setPriority(priority);
            
            task.setStatus(TaskStatus.PENDING);
            task.setCreatedAt(java.time.LocalDateTime.now());
            task.setUpdatedAt(java.time.LocalDateTime.now());
            task.setCourse(course);
            
            // Store the task
            allTasks.put(task.getId(), task);
            tasksByCourse.computeIfAbsent(courseName, k -> new ArrayList<>()).add(task);
            tasks.add(task);
        }
        
        // Save to file after creating tasks
        saveTasksToFile();
        
        return tasks;
    }
    
    private Course getOrCreateCourse(String courseName) {
        // For now, create a simple course object
        // In a real app, you'd check if the course exists in the database
        Course course = new Course();
        course.setId(1L); // Simple ID for now
        course.setCourseName(courseName);
        course.setName(courseName);
        course.setCourseCode(extractCourseCode(courseName));
        course.setDescription("Course created from syllabus upload");
        course.setCreatedAt(java.time.LocalDateTime.now());
        course.setUpdatedAt(java.time.LocalDateTime.now());
        return course;
    }
    
    private String extractCourseCode(String courseName) {
        // Extract course code like "CS 3510" from course name
        if (courseName != null && courseName.matches(".*[A-Z]{2,4}\\s+\\d{3}.*")) {
            String[] parts = courseName.split("\\s+");
            if (parts.length >= 2) {
                return parts[0] + " " + parts[1];
            }
        }
        return courseName != null ? courseName : "Unknown";
    }

    public List<Task> getAllTasks() {
        return new ArrayList<>(allTasks.values());
    }
    
    public List<Task> getTasksByCourse(String courseName) {
        return tasksByCourse.getOrDefault(courseName, new ArrayList<>());
    }
    
    public List<String> getAllCourseNames() {
        return new ArrayList<>(tasksByCourse.keySet());
    }
    
    public void deleteTask(Long taskId) {
        Task task = allTasks.remove(taskId);
        if (task != null) {
            // Remove from course-specific list
            for (List<Task> courseTasks : tasksByCourse.values()) {
                courseTasks.removeIf(t -> t.getId().equals(taskId));
            }
            saveTasksToFile();
        }
    }
    
    public void deleteAllTasks() {
        allTasks.clear();
        tasksByCourse.clear();
        saveTasksToFile();
    }
    
    public void deleteTasksByCourse(String courseName) {
        List<Task> courseTasks = tasksByCourse.remove(courseName);
        if (courseTasks != null) {
            for (Task task : courseTasks) {
                allTasks.remove(task.getId());
            }
            saveTasksToFile();
        }
    }
    
    public Task updateTask(Long taskId, Map<String, Object> updates) {
        Task task = allTasks.get(taskId);
        if (task == null) {
            throw new RuntimeException("Task not found");
        }
        
        if (updates.containsKey("title")) {
            task.setTitle((String) updates.get("title"));
        }
        if (updates.containsKey("description")) {
            task.setDescription((String) updates.get("description"));
        }
        if (updates.containsKey("status")) {
            task.setStatus(TaskStatus.valueOf((String) updates.get("status")));
        }
        if (updates.containsKey("priority")) {
            task.setPriority(Priority.valueOf((String) updates.get("priority")));
        }
        if (updates.containsKey("dueDate")) {
            task.setDueDate(parseDate((String) updates.get("dueDate")));
        }
        
        task.setUpdatedAt(java.time.LocalDateTime.now());
        saveTasksToFile();
        return task;
    }
    
    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            throw new IllegalArgumentException("Date string is null or empty");
        }
        
        dateStr = dateStr.trim();
        
        // List of common date formats to try
        DateTimeFormatter[] formatters = {
            // MM-DD-YYYY formats
            DateTimeFormatter.ofPattern("M-d-yyyy"),
            DateTimeFormatter.ofPattern("MM-dd-yyyy"),
            DateTimeFormatter.ofPattern("M/d/yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("M-d-yy"),
            DateTimeFormatter.ofPattern("MM-dd-yy"),
            DateTimeFormatter.ofPattern("M/d/yy"),
            DateTimeFormatter.ofPattern("MM/dd/yy"),
            
            // YYYY-MM-DD formats
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("yyyy-M-d"),
            
            // Month name formats with year
            DateTimeFormatter.ofPattern("MMMM d, yyyy"),
            DateTimeFormatter.ofPattern("MMM d, yyyy"),
            DateTimeFormatter.ofPattern("MMMM d, yy"),
            DateTimeFormatter.ofPattern("MMM d, yy"),
            DateTimeFormatter.ofPattern("d MMMM yyyy"),
            DateTimeFormatter.ofPattern("d MMM yyyy"),
            DateTimeFormatter.ofPattern("d MMMM yy"),
            DateTimeFormatter.ofPattern("d MMM yy"),
            
            // Month name formats without year (assume current year)
            DateTimeFormatter.ofPattern("MMMM d"),
            DateTimeFormatter.ofPattern("MMM d"),
            DateTimeFormatter.ofPattern("d MMMM"),
            DateTimeFormatter.ofPattern("d MMM"),
            
            // Ordinal formats
            DateTimeFormatter.ofPattern("MMMM d'th', yyyy"),
            DateTimeFormatter.ofPattern("MMMM d'st', yyyy"),
            DateTimeFormatter.ofPattern("MMMM d'nd', yyyy"),
            DateTimeFormatter.ofPattern("MMMM d'rd', yyyy"),
            DateTimeFormatter.ofPattern("MMM d'th', yyyy"),
            DateTimeFormatter.ofPattern("MMM d'st', yyyy"),
            DateTimeFormatter.ofPattern("MMM d'nd', yyyy"),
            DateTimeFormatter.ofPattern("MMM d'rd', yyyy"),
            
            // ISO format
            DateTimeFormatter.ISO_LOCAL_DATE
        };
        
        // Try each formatter
        for (DateTimeFormatter formatter : formatters) {
            try {
                LocalDate parsedDate = LocalDate.parse(dateStr, formatter);
                
                // If the parsed date doesn't have a year (year is 1970), assume current year
                if (parsedDate.getYear() == 1970) {
                    parsedDate = parsedDate.withYear(2025);
                }
                
                return parsedDate;
            } catch (DateTimeParseException ignored) {
                // Continue to next formatter
            }
        }
        
        // If all formatters fail, try to extract date components manually
        try {
            return extractDateComponents(dateStr);
        } catch (Exception e) {
            throw new IllegalArgumentException("Unable to parse date: " + dateStr + ". Supported formats: MM-DD-YYYY, MM/DD/YYYY, Month DD, YYYY, etc.", e);
        }
    }
    
    private LocalDate extractDateComponents(String dateStr) {
        // Try to extract month, day, year from various patterns
        String lowerDateStr = dateStr.toLowerCase();
        
        // Month name mapping
        Map<String, Integer> monthMap = new HashMap<>();
        monthMap.put("january", 1); monthMap.put("jan", 1);
        monthMap.put("february", 2); monthMap.put("feb", 2);
        monthMap.put("march", 3); monthMap.put("mar", 3);
        monthMap.put("april", 4); monthMap.put("apr", 4);
        monthMap.put("may", 5);
        monthMap.put("june", 6); monthMap.put("jun", 6);
        monthMap.put("july", 7); monthMap.put("jul", 7);
        monthMap.put("august", 8); monthMap.put("aug", 8);
        monthMap.put("september", 9); monthMap.put("sep", 9); monthMap.put("sept", 9);
        monthMap.put("october", 10); monthMap.put("oct", 10);
        monthMap.put("november", 11); monthMap.put("nov", 11);
        monthMap.put("december", 12); monthMap.put("dec", 12);
        
        // Try to find month name
        for (Map.Entry<String, Integer> entry : monthMap.entrySet()) {
            if (lowerDateStr.contains(entry.getKey())) {
                // Extract day and year
                String[] parts = dateStr.split("\\s+");
                int month = entry.getValue();
                int day = 1;
                int year = 2025; // Default to 2025
                
                for (String part : parts) {
                    part = part.replaceAll("[^\\d]", ""); // Remove non-digits
                    if (!part.isEmpty()) {
                        int num = Integer.parseInt(part);
                        if (num >= 1 && num <= 31) {
                            day = num;
                        } else if (num >= 1900 && num <= 2100) {
                            year = num;
                        } else if (num >= 0 && num <= 99) {
                            year = 2000 + num; // Assume 20xx
                        }
                    }
                }
                
                return LocalDate.of(year, month, day);
            }
        }
        
        throw new IllegalArgumentException("Could not extract date components from: " + dateStr);
    }
    
    private void saveTasksToFile() {
        try {
            // Save all tasks
            objectMapper.writeValue(tasksFilePath.toFile(), new ArrayList<>(allTasks.values()));
            
            // Save course structure
            Map<String, List<Long>> courseTaskIds = new HashMap<>();
            for (Map.Entry<String, List<Task>> entry : tasksByCourse.entrySet()) {
                courseTaskIds.put(entry.getKey(), 
                    entry.getValue().stream().map(Task::getId).collect(java.util.stream.Collectors.toList()));
            }
            objectMapper.writeValue(coursesFilePath.toFile(), courseTaskIds);
            
        } catch (IOException e) {
            System.err.println("Failed to save tasks to file: " + e.getMessage());
        }
    }
    
    private void loadTasksFromFile() {
        try {
            // Load tasks if file exists
            if (Files.exists(tasksFilePath)) {
                List<Task> loadedTasks = objectMapper.readValue(
                    tasksFilePath.toFile(), 
                    new TypeReference<List<Task>>() {}
                );
                
                // Rebuild maps
                allTasks.clear();
                tasksByCourse.clear();
                long maxId = 0;
                
                for (Task task : loadedTasks) {
                    allTasks.put(task.getId(), task);
                    maxId = Math.max(maxId, task.getId());
                }
                
                // Set next task ID
                nextTaskId = maxId + 1;
                
                // Rebuild course structure
                if (Files.exists(coursesFilePath)) {
                    Map<String, List<Long>> courseTaskIds = objectMapper.readValue(
                        coursesFilePath.toFile(),
                        new TypeReference<Map<String, List<Long>>>() {}
                    );
                    
                    for (Map.Entry<String, List<Long>> entry : courseTaskIds.entrySet()) {
                        List<Task> courseTasks = new ArrayList<>();
                        for (Long taskId : entry.getValue()) {
                            Task task = allTasks.get(taskId);
                            if (task != null) {
                                courseTasks.add(task);
                            }
                        }
                        tasksByCourse.put(entry.getKey(), courseTasks);
                    }
                }
                
                System.out.println("Loaded " + allTasks.size() + " tasks from file");
            }
        } catch (IOException e) {
            System.err.println("Failed to load tasks from file: " + e.getMessage());
        }
    }
}