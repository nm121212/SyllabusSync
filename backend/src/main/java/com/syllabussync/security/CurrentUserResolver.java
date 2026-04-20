package com.syllabussync.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUserResolver {

    private final boolean authRequired;

    public CurrentUserResolver(
            @Value("${app.auth.required:false}") boolean authRequired) {
        this.authRequired = authRequired;
    }

    public CurrentUser currentUserOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof CurrentUser cu) return cu;
        return null;
    }

    public String currentUserId() {
        CurrentUser u = currentUserOrNull();
        if (u != null) return u.userId();
        if (authRequired) throw new UnauthorizedException("Not signed in");
        return "default-user";
    }

    public String requireUserId() {
        CurrentUser u = currentUserOrNull();
        if (u == null) throw new UnauthorizedException("Not signed in");
        return u.userId();
    }

    public boolean isAuthRequired() {
        return authRequired;
    }
}
