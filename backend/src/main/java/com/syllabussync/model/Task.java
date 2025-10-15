package com.syllabussync.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Task entity representing an assignment, exam, or other academic deliverable.
 */
@Entity
@Table(name = "tasks")
public class Task {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Size(max = 200)
    private String title;
    
    @Size(max = 1000)
    private String description;
    
    @NotNull
    @Enumerated(EnumType.STRING)
    private TaskType type;
    
    @NotNull
    @Enumerated(EnumType.STRING)
    private TaskStatus status = TaskStatus.PENDING;
    
    @NotNull
    @Enumerated(EnumType.STRING)
    private Priority priority = Priority.MEDIUM;
    
    @NotNull
    @Column(name = "due_date")
    private LocalDate dueDate;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @Column(name = "google_event_id")
    private String googleEventId;
    
    @Column(name = "is_reminder_enabled")
    private Boolean isReminderEnabled = true;
    
    @Column(name = "reminder_days")
    private Integer reminderDays = 7;
    
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;
    
    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Reminder> reminders = new ArrayList<>();
    
    // Constructors
    public Task() {}
    
    public Task(String title, TaskType type, LocalDate dueDate, User user, Course course) {
        this.title = title;
        this.type = type;
        this.dueDate = dueDate;
        this.user = user;
        this.course = course;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public TaskType getType() {
        return type;
    }
    
    public void setType(TaskType type) {
        this.type = type;
    }
    
    public TaskStatus getStatus() {
        return status;
    }
    
    public void setStatus(TaskStatus status) {
        this.status = status;
        if (status == TaskStatus.COMPLETED && completedAt == null) {
            this.completedAt = LocalDateTime.now();
        } else if (status != TaskStatus.COMPLETED) {
            this.completedAt = null;
        }
    }
    
    public Priority getPriority() {
        return priority;
    }
    
    public void setPriority(Priority priority) {
        this.priority = priority;
    }
    
    public LocalDate getDueDate() {
        return dueDate;
    }
    
    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }
    

    
    public LocalDateTime getCompletedAt() {
        return completedAt;
    }
    
    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
    
    public String getGoogleEventId() {
        return googleEventId;
    }
    
    public void setGoogleEventId(String googleEventId) {
        this.googleEventId = googleEventId;
    }
    
    public Boolean getIsReminderEnabled() {
        return isReminderEnabled;
    }
    
    public void setIsReminderEnabled(Boolean isReminderEnabled) {
        this.isReminderEnabled = isReminderEnabled;
    }
    
    public Integer getReminderDays() {
        return reminderDays;
    }
    
    public void setReminderDays(Integer reminderDays) {
        this.reminderDays = reminderDays;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public Course getCourse() {
        return course;
    }
    
    public void setCourse(Course course) {
        this.course = course;
    }
    
    public List<Reminder> getReminders() {
        return reminders;
    }
    
    public void setReminders(List<Reminder> reminders) {
        this.reminders = reminders;
    }
    
    // Helper methods
    public boolean isOverdue() {
        return status != TaskStatus.COMPLETED && dueDate.isBefore(LocalDate.now());
    }
    
    public boolean isDueSoon() {
        return status != TaskStatus.COMPLETED && 
               dueDate.isBefore(LocalDate.now().plusDays(3)) && 
               dueDate.isAfter(LocalDate.now());
    }
    
    public long getDaysUntilDue() {
        return java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), dueDate);
    }
    
    public void addReminder(Reminder reminder) {
        reminders.add(reminder);
        reminder.setTask(this);
    }
    
    public void removeReminder(Reminder reminder) {
        reminders.remove(reminder);
        reminder.setTask(null);
    }
    
    public void markAsCompleted() {
        setStatus(TaskStatus.COMPLETED);
    }
    
    public void markAsPending() {
        setStatus(TaskStatus.PENDING);
    }
}
