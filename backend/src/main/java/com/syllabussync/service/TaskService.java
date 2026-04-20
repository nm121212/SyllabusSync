package com.syllabussync.service;

import com.syllabussync.model.Course;
import com.syllabussync.model.Priority;
import com.syllabussync.model.Task;
import com.syllabussync.model.TaskStatus;
import com.syllabussync.model.TaskType;
import com.syllabussync.model.User;
import com.syllabussync.repository.CourseRepository;
import com.syllabussync.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Persists tasks per authenticated Supabase user ({@code userId} = JWT {@code sub}) via JPA / Postgres.
 */
@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final CourseRepository courseRepository;
    private final UserAccountService userAccountService;

    public TaskService(
            TaskRepository taskRepository,
            CourseRepository courseRepository,
            UserAccountService userAccountService) {
        this.taskRepository = taskRepository;
        this.courseRepository = courseRepository;
        this.userAccountService = userAccountService;
    }

    @Transactional
    public List<Task> createTasksFromParsedData(String userId, List<Map<String, Object>> parsedTasks, String courseName) {
        Objects.requireNonNull(userId, "userId is required to create tasks");
        User user = userAccountService.getOrCreateUserForSupabaseSub(userId);
        String cn = (courseName != null && !courseName.isBlank()) ? courseName : "Unknown Course";
        Course course = getOrCreateCourseEntity(user, cn);

        List<Task> tasks = new ArrayList<>();
        for (Map<String, Object> taskData : parsedTasks) {
            Task task = new Task();
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

            String priorityStr = (String) taskData.get("priority");
            Priority priority;
            try {
                priority = Priority.valueOf(priorityStr);
            } catch (IllegalArgumentException | NullPointerException e) {
                priority = Priority.MEDIUM;
            }

            task.setType(taskType);
            task.setPriority(priority);
            task.setStatus(TaskStatus.PENDING);
            task.setUser(user);
            task.setCourse(course);
            task.setCreatedAt(LocalDateTime.now());
            task.setUpdatedAt(LocalDateTime.now());
            tasks.add(taskRepository.save(task));
        }
        return tasks;
    }

    private Course getOrCreateCourseEntity(User user, String courseName) {
        return courseRepository.findByUser_IdAndCourseName(user.getId(), courseName).orElseGet(() -> {
            Course c = new Course();
            c.setCourseName(courseName);
            c.setName(courseName);
            c.setCourseCode(extractCourseCode(courseName));
            c.setDescription("Course created from syllabus upload");
            c.setUser(user);
            return courseRepository.save(c);
        });
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

    @Transactional(readOnly = true)
    public List<Task> getAllTasks(String userId) {
        return taskRepository.findAllForUserWithCourse(userId);
    }

    @Transactional(readOnly = true)
    public List<Task> getTasksByCourse(String userId, String courseName) {
        if (courseName == null || courseName.isBlank()) {
            return List.of();
        }
        return taskRepository.findByUserAndCourseNameWithCourse(userId, courseName);
    }

    @Transactional(readOnly = true)
    public List<String> getAllCourseNames(String userId) {
        return taskRepository.findDistinctCourseNamesForUser(userId);
    }

    @Transactional
    public void deleteTask(String userId, Long taskId) {
        taskRepository.findByIdAndUser_SupabaseSub(taskId, userId).ifPresent(taskRepository::delete);
    }

    @Transactional
    public void deleteAllTasks(String userId) {
        taskRepository.deleteAllForUser(userId);
    }

    @Transactional
    public Task updateTask(String userId, Long taskId, Map<String, Object> updates) {
        Task task = taskRepository.findByIdAndUser_SupabaseSub(taskId, userId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

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
        if (updates.containsKey("type")) {
            task.setType(TaskType.valueOf((String) updates.get("type")));
        }
        if (updates.containsKey("dueDate")) {
            task.setDueDate(parseDate((String) updates.get("dueDate")));
        }
        if (updates.containsKey("googleEventId")) {
            task.setGoogleEventId((String) updates.get("googleEventId"));
        }

        task.setUpdatedAt(LocalDateTime.now());
        return taskRepository.save(task);
    }

    @Transactional
    public Task saveTask(String userId, Task task) {
        Objects.requireNonNull(userId, "userId is required to save a task");
        User user = userAccountService.getOrCreateUserForSupabaseSub(userId);

        Course course;
        if (task.getCourse() != null && task.getCourse().getId() != null) {
            course = courseRepository.findByIdAndUser_Id(task.getCourse().getId(), user.getId())
                    .orElseGet(() -> getOrCreateCourseEntity(user, resolveCourseBucketName(task)));
        } else {
            course = getOrCreateCourseEntity(user, resolveCourseBucketName(task));
        }

        task.setUser(user);
        task.setCourse(course);

        if (task.getId() != null) {
            return taskRepository.findByIdAndUser_SupabaseSub(task.getId(), userId)
                    .map(existing -> {
                        copyMutableFields(task, existing);
                        return taskRepository.save(existing);
                    })
                    .orElseGet(() -> {
                        task.setId(null);
                        return taskRepository.save(task);
                    });
        }
        return taskRepository.save(task);
    }

    private static String resolveCourseBucketName(Task task) {
        if (task.getCourse() == null) {
            return "AI Assistant Tasks";
        }
        if (task.getCourse().getCourseName() != null && !task.getCourse().getCourseName().isBlank()) {
            return task.getCourse().getCourseName();
        }
        if (task.getCourse().getName() != null && !task.getCourse().getName().isBlank()) {
            return task.getCourse().getName();
        }
        return "AI Assistant Tasks";
    }

    private static void copyMutableFields(Task from, Task to) {
        if (from.getTitle() != null) {
            to.setTitle(from.getTitle());
        }
        if (from.getDescription() != null) {
            to.setDescription(from.getDescription());
        }
        if (from.getType() != null) {
            to.setType(from.getType());
        }
        if (from.getStatus() != null) {
            to.setStatus(from.getStatus());
        }
        if (from.getPriority() != null) {
            to.setPriority(from.getPriority());
        }
        if (from.getDueDate() != null) {
            to.setDueDate(from.getDueDate());
        }
        if (from.getGoogleEventId() != null) {
            to.setGoogleEventId(from.getGoogleEventId());
        }
        if (from.getIsReminderEnabled() != null) {
            to.setIsReminderEnabled(from.getIsReminderEnabled());
        }
        if (from.getReminderDays() != null) {
            to.setReminderDays(from.getReminderDays());
        }
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
        monthMap.put("january", 1);
        monthMap.put("jan", 1);
        monthMap.put("february", 2);
        monthMap.put("feb", 2);
        monthMap.put("march", 3);
        monthMap.put("mar", 3);
        monthMap.put("april", 4);
        monthMap.put("apr", 4);
        monthMap.put("may", 5);
        monthMap.put("june", 6);
        monthMap.put("jun", 6);
        monthMap.put("july", 7);
        monthMap.put("jul", 7);
        monthMap.put("august", 8);
        monthMap.put("aug", 8);
        monthMap.put("september", 9);
        monthMap.put("sep", 9);
        monthMap.put("sept", 9);
        monthMap.put("october", 10);
        monthMap.put("oct", 10);
        monthMap.put("november", 11);
        monthMap.put("nov", 11);
        monthMap.put("december", 12);
        monthMap.put("dec", 12);

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
}
