package com.syllabussync.service;

import com.syllabussync.model.User;
import com.syllabussync.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserAccountService {

    private final UserRepository userRepository;

    public UserAccountService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User getOrCreateUserForGoogleSub(String googleSub) {
        return getOrCreateUserForGoogleSub(googleSub, null, null);
    }

    @Transactional
    public User getOrCreateUserForGoogleSub(String googleSub, String email, String name) {
        // Fast path: existing user matched by Google sub
        var existing = userRepository.findByGoogleSub(googleSub);
        if (existing.isPresent()) return existing.get();

        // If we have an email, try to find a pre-existing user and link the Google sub
        if (email != null && !email.isBlank()) {
            var byEmail = userRepository.findByEmail(email);
            if (byEmail.isPresent()) {
                User u = byEmail.get();
                u.setGoogleSub(googleSub);
                return userRepository.save(u);
            }
        }

        // Create a new user row
        User u = new User();
        u.setGoogleSub(googleSub);
        u.setEmail(email != null && !email.isBlank() ? email : syntheticEmail(googleSub));
        if (name != null && !name.isBlank()) {
            String[] parts = name.split(" ", 2);
            u.setFirstName(parts[0]);
            u.setLastName(parts.length > 1 ? parts[1] : " ");
        } else {
            u.setFirstName("User");
            u.setLastName(" ");
        }
        return userRepository.save(u);
    }

    private static String syntheticEmail(String googleSub) {
        String safe = googleSub.replaceAll("[^a-zA-Z0-9._+-]", "_");
        return safe + "@users.syllabussync.local";
    }
}
