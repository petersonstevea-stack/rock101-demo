ALTER TABLE class_sessions
RENAME COLUMN director_feedback TO class_instructor_notes;
ALTER TABLE parent_update_log
RENAME COLUMN director_email TO class_instructor_email;
ALTER TABLE rock_classes
RENAME COLUMN director_email TO class_instructor_email;
ALTER TABLE rock_classes
RENAME COLUMN director_user_id TO class_instructor_id;
ALTER TABLE show_group_instances
RENAME COLUMN director_user_id TO class_instructor_id;
