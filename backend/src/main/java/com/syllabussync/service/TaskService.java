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

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-process task store, scoped per authenticated user.
 *
 * Before this refactor every caller shared a single {@code allTasks} map,
 * which meant that once we introduced per-user Supabase sessions every user
 * would still see every other user's tasks. We now keep a separate bucket
 * per {@code userId} (Supabase {@code sub}) and persist each bucket into its
 * own JSON file so the store survives a container restart.
 *
 * Note: this is still a file-backed in-memory store. Moving to JPA for tasks
 * is the right long-term home, but would require a bigger schema migration
 * than fits in this change. Scoping by userId here is what unlocks real
 * per-user sessions end-to-end.
 */
@Service
public class TaskService {

    /**
     * Per-user buckets. Using {@link ConcurrentHashMap} at both levels so we
     * can safely serve concurrent requests from different sessions without
     * needing a synchronized block around every mutation.
     */
    private final Map<String, Map<Long, Task>> tasksByUser = new ConcurrentHashMap<>();
    private final Map<String, Map<String, List<Task>>> tasksByUserCourse = new ConcurrentHashMap<>();
    private final Map<String, Long> nextTaskIdByUser = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper;
    private final Path dataDir;

    public TaskService() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        this.objectMapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        this.dataDir = Paths.get(
                Optional.ofNullable(System.getenv("TASKS_DATA_DIR")).orElse("./data/tasks"));
        try {
            Files.createDirectories(dataDir);
        } catch (IOException e) {
            System.err.println("Failed to prepare task data directory: " + e.getMessage());
        }
    }

    public List<Task> createTasksFromParsedData(String userId, List<Map<String, Object>> parsedTasks, String courseName) {
        Objects.requireNonNull(userId, "userId is required to create tasks");
        List<Task> tasks = new ArrayList<>();

        Course course = getOrCreateCourse(courseName);

        Map<Long, Task> userTasks = userBucket(userId);
        Map<String, List<Task>> userCourseTasks =
                tasksByUserCourse.computeIfAbsent(userId, k -> new ConcurrentHashMap<>());

        for (Map<String, Object> taskData : parsedTasks) {
            Task task = new Task();
            task.setId(nextId(userId));
            task.setTitle((String) taskData.get("title"));
            task.setDescription((String) taskData.get("description"));
            task.setDueDate(parseDate((String) taskData.get("dueDate")));

            String typeStr = (String) taskData.get("type");
            TaskType taskType;
            try {
                taskType = TaskType.valueOf(typeStr);
            } catch (IllegalArgumentException | NullPointerException e) {
                taskType = TaskType.OTHER;
            }
            task.setType(taskType);

            String priorityStr = (String) taskData.get("priority");
            Priority priority;
            try {
                priority = Priority.valueOf(priorityStr);
            } catch (IllegalArgumentException | NullPointerException e) {
                priority = Priority.MEDIUM;
            }
            task.setPriority(priority);

            task.setStatus(TaskStatus.PENDING);
            task.setCreatedAt(java.time.LocalDateTime.now());
            task.setUpdatedAt(java.time.LocalDateTime.now());
            task.setCourse(course);

            userTasks.put(task.getId(), task);
            userCourseTasks.computeIfAbsent(courseName, k -> new ArrayList<>()).add(task);
            tasks.add(task);
        }

        saveTasksToFile(userId);
        return tasks;
    }

    private Course getOrCreateCourse(String courseName) {
        Course course = new Course();
        course.setId(1L);
        course.setCourseName(courseName);
        course.setName(courseName);
        course.setCourseCode(extractCourseCode(courseName));
        course.setDescription("Course created from syllabus upload");
        course.setCreatedAt(java.time.LocalDateTime.now());
        course.setUpdatedAt(java.time.LocalDateTime.now());
        return course;
    }

    private String extractCourseCode(String courseName) {
        if (courseName != null && courseName.matches(".*[A-Z]{2,4}\\s+\\d{3}.*")) {
            String[] parts = courseName.split("\\s+");
            if (parts.length >= 2) {
                return parts[0] + " " + parts[1];
            }
        }
        return courseName != null ? courseName : "Unknown";
    }

    public List<Task> getAllTasks(String userId) {
        return new ArrayList<>(userBucket(userId).values());
    }

    public List<Task> getTasksByCourse(String userId, String courseName) {
        Map<String, List<Task>> bucket = tasksByUserCourse.get(userId);
        if (bucket == null) {
            return new ArrayList<>();
        }
        return bucket.getOrDefault(courseName, new ArrayList<>());
    }

    public List<String> getAllCourseNames(String userId) {
        Map<String, List<Task>> bucket = tasksByUserCourse.get(userId);
        return bucket == null ? List.of() : new ArrayList<>(bucket.keySet());
    }

    public void deleteTask(String userId, Long taskId) {
        Map<Long, Task> userTasks = userBucket(userId);
        Task task = userTasks.remove(taskId);
        if (task != null) {
            Map<String, List<Task>> courses = tasksByUserCourse.get(userId);
            if (courses != null) {
                for (List<Task> courseTasks : courses.values()) {
                    courseTasks.removeIf(t -> t.getId().equals(taskId));
                }
            }
            saveTasksToFile(userId);
        }
    }

    public void deleteAllTasks(String userId) {
        tasksByUser.computeIfPresent(userId, (k, v) -> { v.clear(); return v; });
        tasksByUserCourse.computeIfPresent(userId, (k, v) -> { v.clear(); return v; });
        saveTasksToFile(userId);
    }

    public Task updateTask(String userId, Long taskId, Map<String, Object> updates) {
        Task task = userBucket(userId).get(taskId);
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
        if (updates.containsKey("googleEventId")) {
            task.setGoogleEventId((String) updates.get("googleEventId"));
        }

        task.setUpdatedAt(java.time.LocalDateTime.now());
        saveTasksToFile(userId);
        return task;
    }

    /** Save a single task (used by the chatbot). */
    public Task saveTask(String userId, Task task) {
        Objects.requireNonNull(userId, "userId is required to save a task");
        Map<Long, Task> userTasks = userBucket(userId);
        if (task.getId() == null) {
            task.setId(nextId(userId));
        }
        if (task.getCourse() == null) {
            task.setCourse(getOrCreateCourse("AI Assistant Tasks"));
        }
        userTasks.put(task.getId(), task);
        String courseName = task.getCourse().getName();
        tasksByUserCourse
                .computeIfAbsent(userId, k -> new ConcurrentHashMap<>())
                .computeIfAbsent(courseName, k -> new ArrayList<>())
                .add(task);
        saveTasksToFile(userId);
        return task;
    }

    private Map<Long, Task> userBucket(String userId) {
        Objects.requireNonNull(userId, "userId is required");
        Map<Long, Task> existing = tasksByUser.get(userId);
        if (existing != null) {
            return existing;
        }
        synchronized (this) {
            existing = tasksByUser.get(userId);
            if (existing != null) {
                return existing;
            }
            loadTasksFromFile(userId);
            existing = tasksByUser.get(userId);
            if (existing == null) {
                existing = new ConcurrentHashMap<>();
                tasksByUser.put(userId, existing);
            }
            tasksByUserCourse.computeIfAbsent(userId, k -> new ConcurrentHashMap<>());
            return existing;
        }
    }

    private long nextId(String userId) {
        return nextTaskIdByUser.compute(userId, (k, current) -> (current == null ? 1L : current + 1));
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            throw new IllegalArgumentException("Date string is null or empty");
        }

        dateStr = dateStr.trim();

        DateTimeFormatter[] formatters = {
            DateTimeFormatter.ofPattern("M-d-yyyy"),
            DateTimeFormatter.ofPattern("MM-dd-yyyy"),
            DateTimeFormatter.ofPattern("M/d/yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("M-d-yy"),
            DateTimeFormatter.ofPattern("MM-dd-yy"),
            DateTimeFormatter.ofPattern("M/d/yy"),
            DateTimeFormatter.ofPattern("MM/dd/yy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("yyyy-M-d"),
            DateTimeFormatter.ofPattern("MMMM d, yyyy"),
            DateTimeFormatter.ofPattern("MMM d, yyyy"),
            DateTimeFormatter.ofPattern("MMMM d, yy"),
            DateTimeFormatter.ofPattern("MMM d, yy"),
            DateTimeFormatter.ofPattern("d MMMM yyyy"),
            DateTimeFormatter.ofPattern("d MMM yyyy"),
            DateTimeFormatter.ofPattern("d MMMM yy"),
            DateTimeFormatter.ofPattern("d MMM yy"),
            DateTimeFormatter.ofPattern("MMMM d"),
            DateTimeFormatter.ofPattern("MMM d"),
            DateTimeFormatter.ofPattern("d MMMM"),
            DateTimeFormatter.ofPattern("d MMM"),
            DateTimeFormatter.ISO_LOCAL_DATE
        };

        for (DateTimeFormatter formatter : formatters) {
            try {
                LocalDate parsedDate = LocalDate.parse(dateStr, formatter);
                if (parsedDate.getYear() == 1970) {
                    parsedDate = parsedDate.withYear(LocalDate.now().getYear());
                }
                return parsedDate;
            } catch (DateTimeParseException ignored) {
                // try next
            }
        }

        try {
            return extractDateComponents(dateStr);
        } catch (Exception e) {
            throw new IllegalArgumentException("Unable to parse date: " + dateStr, e);
        }
    }

    private LocalDate extractDateComponents(String dateStr) {
        String lowerDateStr = dateStr.toLowerCase();

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

        for (Map.Entry<String, Integer> entry : monthMap.entrySet()) {
            if (lowerDateStr.contains(entry.getKey())) {
                String[] parts = dateStr.split("\\s+");
                int month = entry.getValue();
                int day = 1;
                int year = LocalDate.now().getYear();

                for (String part : parts) {
                    part = part.replaceAll("[^\\d]", "");
                    if (!part.isEmpty()) {
                        int num = Integer.parseInt(part);
                        if (num >= 1 && num <= 31) {
                            day = num;
                        } else if (num >= 1900 && num <= 2100) {
                            year = num;
                        } else if (num >= 0 && num <= 99) {
                            year = 2000 + num;
                        }
                    }
                }

                return LocalDate.of(year, month, day);
            }
        }

        throw new IllegalArgumentException("Could not extract date components from: " + dateStr);
    }

    private Path userFile(String userId) {
        // Sanitise the Supabase sub (UUID) just in case — also handles the
        // legacy "default-user" bucket.
        String safe = userId.replaceAll("[^A-Za-z0-9_-]", "_");
        return dataDir.resolve("tasks-" + safe + ".json");
    }

    private Path userCoursesFile(String userId) {
        String safe = userId.replaceAll("[^A-Za-z0-9_-]", "_");
        return dataDir.resolve("courses-" + safe + ".json");
    }

    private synchronized void saveTasksToFile(String userId) {
        try {
            Map<Long, Task> userTasks = tasksByUser.getOrDefault(userId, Map.of());
            objectMapper.writeValue(userFile(userId).toFile(), new ArrayList<>(userTasks.values()));

            Map<String, List<Long>> courseTaskIds = new HashMap<>();
            Map<String, List<Task>> userCourseTasks = tasksByUserCourse.getOrDefault(userId, Map.of());
            for (Map.Entry<String, List<Task>> entry : userCourseTasks.entrySet()) {
                courseTaskIds.put(entry.getKey(),
                        entry.getValue().stream().map(Task::getId).toList());
            }
            objectMapper.writeValue(userCoursesFile(userId).toFile(), courseTaskIds);
        } catch (IOException e) {
            System.err.println("Failed to save tasks to file for user " + userId + ": " + e.getMessage());
        }
    }

    private synchronized void loadTasksFromFile(String userId) {
        try {
            Path tasksFile = userFile(userId);
            if (!Files.exists(tasksFile)) {
                return;
            }
            List<Task> loadedTasks = objectMapper.readValue(
                    tasksFile.toFile(),
                    new TypeReference<List<Task>>() {}
            );

            Map<Long, Task> userTasks = new ConcurrentHashMap<>();
            long maxId = 0;
            for (Task task : loadedTasks) {
                if (task.getId() != null) {
                    userTasks.put(task.getId(), task);
                    maxId = Math.max(maxId, task.getId());
                }
            }
            tasksByUser.put(userId, userTasks);
            nextTaskIdByUser.put(userId, maxId + 1);

            Path coursesFile = userCoursesFile(userId);
            if (Files.exists(coursesFile)) {
                Map<String, List<Long>> courseTaskIds = objectMapper.readValue(
                        coursesFile.toFile(),
                        new TypeReference<Map<String, List<Long>>>() {}
                );
                Map<String, List<Task>> byCourse = new ConcurrentHashMap<>();
                for (Map.Entry<String, List<Long>> entry : courseTaskIds.entrySet()) {
                    List<Task> courseTasks = new ArrayList<>();
                    for (Long taskId : entry.getValue()) {
                        Task task = userTasks.get(taskId);
                        if (task != null) {
                            courseTasks.add(task);
                        }
                    }
                    byCourse.put(entry.getKey(), courseTasks);
                }
                tasksByUserCourse.put(userId, byCourse);
            }
        } catch (IOException e) {
            System.err.println("Failed to load tasks for user " + userId + ": " + e.getMessage());
        }
    }
}
