package com.syllabussync.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Reminder entity for task notifications.
 */
@Entity
@Table(name = "reminders")
public class Reminder {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull
    @Column(name = "reminder_date")
    private LocalDateTime reminderDate;
    
    @NotNull
    @Enumerated(EnumType.STRING)
    private ReminderStatus status = ReminderStatus.PENDING;
    
    @Column(name = "sent_at")
    private LocalDateTime sentAt;
    
    @Column(name = "email_sent")
    private Boolean emailSent = false;
    
    @Column(name = "notification_sent")
    private Boolean notificationSent = false;
    
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;
    
    // Constructors
    public Reminder() {}
    
    public Reminder(LocalDateTime reminderDate, Task task) {
        this.reminderDate = reminderDate;
        this.task = task;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public LocalDateTime getReminderDate() {
        return reminderDate;
    }
    
    public void setReminderDate(LocalDateTime reminderDate) {
        this.reminderDate = reminderDate;
    }
    
    public ReminderStatus getStatus() {
        return status;
    }
    
    public void setStatus(ReminderStatus status) {
        this.status = status;
        if (status == ReminderStatus.SENT && sentAt == null) {
            this.sentAt = LocalDateTime.now();
        }
    }
    
    public LocalDateTime getSentAt() {
        return sentAt;
    }
    
    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }
    
    public Boolean getEmailSent() {
        return emailSent;
    }
    
    public void setEmailSent(Boolean emailSent) {
        this.emailSent = emailSent;
    }
    
    public Boolean getNotificationSent() {
        return notificationSent;
    }
    
    public void setNotificationSent(Boolean notificationSent) {
        this.notificationSent = notificationSent;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public Task getTask() {
        return task;
    }
    
    public void setTask(Task task) {
        this.task = task;
    }
    
    // Helper methods
    public boolean isOverdue() {
        return status == ReminderStatus.PENDING && reminderDate.isBefore(LocalDateTime.now());
    }
    
    public void markAsSent() {
        setStatus(ReminderStatus.SENT);
        setEmailSent(true);
        setNotificationSent(true);
    }
}
