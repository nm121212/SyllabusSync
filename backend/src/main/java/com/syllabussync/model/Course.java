package com.syllabussync.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Course entity representing an academic course.
 */
@Entity
@Table(name = "courses")
public class Course {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Size(max = 20)
    @Column(name = "course_code")
    private String courseCode;
    
    @NotBlank
    @Size(max = 200)
    @Column(name = "course_name")
    private String courseName;
    
    @NotBlank
    @Size(max = 200)
    private String name;
    
    @Size(max = 1000)
    private String description;
    
    @Size(max = 100)
    private String instructor;
    
    @Size(max = 20)
    private String semester;
    
    @Column(name = "academic_year")
    private Integer academicYear;
    
    @Column(name = "is_active")
    private Boolean isActive = true;
    
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Task> tasks = new ArrayList<>();
    
    // Constructors
    public Course() {}
    
    public Course(String courseCode, String courseName, User user) {
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.name = courseName;
        this.user = user;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getCourseCode() {
        return courseCode;
    }
    
    public void setCourseCode(String courseCode) {
        this.courseCode = courseCode;
    }
    
    public String getCourseName() {
        return courseName;
    }
    
    public void setCourseName(String courseName) {
        this.courseName = courseName;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    

    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getInstructor() {
        return instructor;
    }
    
    public void setInstructor(String instructor) {
        this.instructor = instructor;
    }
    
    public String getSemester() {
        return semester;
    }
    
    public void setSemester(String semester) {
        this.semester = semester;
    }
    
    public Integer getAcademicYear() {
        return academicYear;
    }
    
    public void setAcademicYear(Integer academicYear) {
        this.academicYear = academicYear;
    }
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
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
    
    public List<Task> getTasks() {
        return tasks;
    }
    
    public void setTasks(List<Task> tasks) {
        this.tasks = tasks;
    }
    
    // Helper methods
    public String getDisplayName() {
        return courseCode + " - " + courseName;
    }
    
    public void addTask(Task task) {
        tasks.add(task);
        task.setCourse(this);
    }
    
    public void removeTask(Task task) {
        tasks.remove(task);
        task.setCourse(null);
    }
    
    public long getTaskCount() {
        return tasks.size();
    }
    
    public long getCompletedTaskCount() {
        return tasks.stream()
                .filter(task -> task.getStatus() == TaskStatus.COMPLETED)
                .count();
    }
    
    public double getCompletionPercentage() {
        if (tasks.isEmpty()) {
            return 0.0;
        }
        return (double) getCompletedTaskCount() / tasks.size() * 100;
    }
}
