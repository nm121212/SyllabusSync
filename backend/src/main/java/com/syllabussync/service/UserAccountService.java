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

    /**
     * Resolve or create the {@link User} row for a Supabase JWT {@code sub}.
     */
    @Transactional
    public User getOrCreateUserForSupabaseSub(String supabaseSub) {
        return userRepository.findBySupabaseSub(supabaseSub).orElseGet(() -> {
            User u = new User();
            u.setSupabaseSub(supabaseSub);
            u.setFirstName("User");
            u.setLastName(" ");
            u.setEmail(syntheticEmail(supabaseSub));
            return userRepository.save(u);
        });
    }

    private static String syntheticEmail(String supabaseSub) {
        String safe = supabaseSub.replaceAll("[^a-zA-Z0-9._+-]", "_");
        return safe + "@users.syllabussync.local";
    }
}
