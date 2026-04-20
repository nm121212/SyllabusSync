-- Baseline schema for PostgreSQL (Supabase, Docker Postgres, etc.).
-- Enum columns use JPA @Enumerated(EnumType.STRING) — stored as enum constant names (e.g. ASSIGNMENT, PENDING).

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    supabase_sub VARCHAR(128) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    avatar VARCHAR(500),
    google_id VARCHAR(255),
    google_refresh_token VARCHAR(2000),
    is_active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE courses (
    id BIGSERIAL PRIMARY KEY,
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(200) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(1000),
    instructor VARCHAR(100),
    semester VARCHAR(20),
    academic_year INTEGER,
    is_active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_courses_user_course_name UNIQUE (user_id, course_name)
);

CREATE INDEX idx_courses_user_id ON courses (user_id);

CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(1000),
    task_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    completed_at TIMESTAMP,
    google_event_id VARCHAR(255),
    is_reminder_enabled BOOLEAN,
    reminder_days INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses (id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_user_id ON tasks (user_id);
CREATE INDEX idx_tasks_course_id ON tasks (course_id);

CREATE TABLE reminders (
    id BIGSERIAL PRIMARY KEY,
    reminder_date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP,
    email_sent BOOLEAN,
    notification_sent BOOLEAN,
    created_at TIMESTAMP,
    task_id BIGINT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE INDEX idx_reminders_task_id ON reminders (task_id);
