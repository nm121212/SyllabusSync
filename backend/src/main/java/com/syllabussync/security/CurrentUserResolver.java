package com.syllabussync.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Central helper that turns the Spring SecurityContext into a stable
 * per-user identifier used everywhere we previously passed "default-user".
 *
 * There are two resolution modes controlled by {@code app.auth.required}:
 *  - required=true (production): a real Supabase JWT must be present; if
 *    missing, {@link #requireUserId()} throws so callers surface a 401.
 *  - required=false (local dev): we fall through to a deterministic local
 *    user id so the app still boots without Supabase configured.
 */
@Component
public class CurrentUserResolver {

    private final boolean authRequired;

    public CurrentUserResolver(
            @Value("${app.auth.required:false}") boolean authRequired) {
        this.authRequired = authRequired;
    }

    /** Returns the authenticated user or {@code null} if none. */
    public CurrentUser currentUserOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof CurrentUser cu) {
            return cu;
        }
        return null;
    }

    /**
     * Returns the canonical id for the current user. Prefers the Supabase
     * `sub` claim; falls back to the legacy shared bucket only when auth
     * isn't strictly required (dev mode).
     */
    public String currentUserId() {
        CurrentUser u = currentUserOrNull();
        if (u != null) {
            return u.supabaseUserId();
        }
        if (authRequired) {
            throw new UnauthorizedException("Not signed in");
        }
        return "default-user";
    }

    /** Like {@link #currentUserId()} but always throws when unauthenticated. */
    public String requireUserId() {
        CurrentUser u = currentUserOrNull();
        if (u == null) {
            throw new UnauthorizedException("Not signed in");
        }
        return u.supabaseUserId();
    }

    public boolean isAuthRequired() {
        return authRequired;
    }
}
