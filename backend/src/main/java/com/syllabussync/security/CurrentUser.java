package com.syllabussync.security;

public record CurrentUser(
        String userId,
        String email,
        String fullName,
        String avatarUrl) {

    public String id() {
        return userId;
    }
}
