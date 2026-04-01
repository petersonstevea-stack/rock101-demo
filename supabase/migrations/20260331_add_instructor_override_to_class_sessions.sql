-- Add instructor_override_user_id to class_sessions
-- Allows per-session instructor assignment (vacation coverage, substitutes)
-- without changing the rock_classes default director assignment.
-- Supports future Pike 13 integration where substitute instructors are assigned per occurrence.

ALTER TABLE class_sessions
ADD COLUMN IF NOT EXISTS instructor_override_user_id UUID;
