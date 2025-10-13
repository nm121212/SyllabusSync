package com.syllabussync.model;

/**
 * Enumeration representing the status of a reminder.
 */
public enum ReminderStatus {
    PENDING("Pending"),
    SENT("Sent"),
    FAILED("Failed"),
    CANCELLED("Cancelled");
    
    private final String displayName;
    
    ReminderStatus(String displayName) {
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
