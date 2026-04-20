package com.syllabussync.security;

/**
 * Authenticated principal extracted from the Supabase-issued JWT.
 *
 * The Supabase `sub` claim is the canonical stable identity for each user
 * and is what we key all per-user data (calendar tokens, tasks) by.
 */
public record CurrentUser(
        String supabaseUserId,
        String email,
        String fullName,
        String avatarUrl) {

    /**
     * Convenience accessor used by services/controllers that only need the
     * stable user id — keeps call sites short while still allowing future
     * growth (e.g. pulling display name for notifications).
     */
    public String id() {
        return supabaseUserId;
    }
}
