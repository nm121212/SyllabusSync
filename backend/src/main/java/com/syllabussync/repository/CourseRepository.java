package com.syllabussync.repository;

import com.syllabussync.model.Course;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {

    Optional<Course> findByIdAndUser_Id(Long courseId, Long userId);

    Optional<Course> findByUser_IdAndCourseName(Long userId, String courseName);
}
