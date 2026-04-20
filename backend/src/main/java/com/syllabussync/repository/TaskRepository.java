package com.syllabussync.repository;

import com.syllabussync.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query("select distinct t from Task t join fetch t.course c where t.user.googleSub = :sub order by t.dueDate asc")
    List<Task> findAllForUserWithCourse(@Param("sub") String sub);

    @Query("select t from Task t join fetch t.course c where t.user.googleSub = :sub and c.courseName = :courseName order by t.dueDate asc")
    List<Task> findByUserAndCourseNameWithCourse(@Param("sub") String sub, @Param("courseName") String courseName);

    @Query("select distinct c.courseName from Task t join t.course c where t.user.googleSub = :sub order by c.courseName")
    List<String> findDistinctCourseNamesForUser(@Param("sub") String sub);

    Optional<Task> findByIdAndUser_GoogleSub(Long id, String googleSub);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from Task t where t.user.googleSub = :sub")
    void deleteAllForUser(@Param("sub") String sub);
}
