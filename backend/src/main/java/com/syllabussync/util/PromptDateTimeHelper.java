package com.syllabussync.util;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Supplies a single, server-derived date/time block for Gemini prompts so
 * "today", "tomorrow", and year inference stay aligned with backend parsing.
 */
public final class PromptDateTimeHelper {

    private PromptDateTimeHelper() {}

    public static ZoneId safeZone(String id) {
        try {
            return ZoneId.of(id != null && !id.isBlank() ? id : "America/New_York");
        } catch (Exception e) {
            return ZoneId.of("America/New_York");
        }
    }

    /**
     * Authoritative instant + local calendar context for prompts (IANA zone, ISO-8601).
     */
    public static String contextBlock(ZoneId zone) {
        ZonedDateTime zdt = ZonedDateTime.now(zone);
        Instant instant = zdt.toInstant();
        LocalDate today = zdt.toLocalDate();
        LocalDate tomorrow = today.plusDays(1);
        int year = today.getYear();
        return """
                AUTHORITATIVE DATE/TIME CONTEXT (use only this for "today", "tomorrow", and calendar year — do not assume any other "current" date):
                - IANA time zone: %s
                - Current instant (UTC, ISO-8601): %s
                - Current local date-time (offset): %s
                - Today's date (YYYY-MM-DD): %s
                - Tomorrow's date (YYYY-MM-DD): %s
                - Current calendar year (when syllabus omits a year): %d
                """.formatted(
                zone.getId(),
                instant.toString(),
                zdt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
                today,
                tomorrow,
                year);
    }
}
