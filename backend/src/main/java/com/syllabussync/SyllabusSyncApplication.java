package com.syllabussync;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main application class for SyllabusSync.
 * 
 * SyllabusSync is an intelligent academic task management system that automatically
 * extracts deadlines and deliverables from course syllabi and syncs them with Google Calendar.
 */
@SpringBootApplication
@EnableCaching
@EnableAsync
@EnableScheduling
public class SyllabusSyncApplication {

    public static void main(String[] args) {
        SpringApplication.run(SyllabusSyncApplication.class, args);
    }
}
