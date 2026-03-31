-- Step 1.18: Session-level sign-off and attendance tracking
-- Anchors instructor sign-offs to specific class_sessions instances
-- replaces the flat students.workflow blob for session-specific data

CREATE TABLE session_student_signoffs (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                      uuid NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id                      uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  private_lesson_absent           boolean NOT NULL DEFAULT false,
  group_class_absent              boolean NOT NULL DEFAULT false,
  instructor_submitted            boolean NOT NULL DEFAULT false,
  instructor_submitted_at         timestamp with time zone,
  instructor_submitted_by         uuid REFERENCES users(id),
  class_instructor_submitted      boolean NOT NULL DEFAULT false,
  class_instructor_submitted_at   timestamp with time zone,
  class_instructor_submitted_by   uuid REFERENCES users(id),
  parent_email_sent               boolean NOT NULL DEFAULT false,
  parent_email_sent_at            timestamp with time zone,
  created_at                      timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);

CREATE INDEX idx_sss_session_id     ON session_student_signoffs (session_id);
CREATE INDEX idx_sss_student_id     ON session_student_signoffs (student_id);
CREATE INDEX idx_sss_session_student ON session_student_signoffs (session_id, student_id);
