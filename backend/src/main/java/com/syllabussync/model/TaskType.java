package com.syllabussync.model;

/**
 * Enumeration representing different types of academic tasks.
 */
public enum TaskType {
    ASSIGNMENT("Assignment"),
    PROJECT("Project"),
    EXAM("Exam"),
    QUIZ("Quiz"),
    LAB("Lab"),
    PRESENTATION("Presentation"),
    PAPER("Paper"),
    DISCUSSION("Discussion"),
    OTHER("Other");
    
    private final String displayName;
    
    TaskType(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    @Override
    public String toString() {
        return displayName;
    }
}
