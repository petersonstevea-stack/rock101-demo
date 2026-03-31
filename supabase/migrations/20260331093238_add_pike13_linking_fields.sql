-- Pike 13 integration linking fields
-- All nullable — additive only, zero impact on existing data or RLS

ALTER TABLE students ADD COLUMN IF NOT EXISTS pike13_person_id text;
ALTER TABLE staff    ADD COLUMN IF NOT EXISTS pike13_person_id text;
ALTER TABLE parents  ADD COLUMN IF NOT EXISTS pike13_person_id text;

ALTER TABLE schools ADD COLUMN IF NOT EXISTS pike13_subdomain text;

ALTER TABLE rock_classes ADD COLUMN IF NOT EXISTS pike13_service_id text;
ALTER TABLE rock_classes ADD COLUMN IF NOT EXISTS program_id text REFERENCES programs(id);

ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS pike13_event_occurrence_id text;

CREATE INDEX IF NOT EXISTS idx_students_pike13       ON students(pike13_person_id);
CREATE INDEX IF NOT EXISTS idx_staff_pike13          ON staff(pike13_person_id);
CREATE INDEX IF NOT EXISTS idx_parents_pike13        ON parents(pike13_person_id);
CREATE INDEX IF NOT EXISTS idx_schools_pike13        ON schools(pike13_subdomain);
CREATE INDEX IF NOT EXISTS idx_rock_classes_pike13   ON rock_classes(pike13_service_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_pike13 ON class_sessions(pike13_event_occurrence_id);