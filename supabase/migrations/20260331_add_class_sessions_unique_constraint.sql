-- Unique constraint on class_sessions to support ON CONFLICT
-- DO NOTHING for session generation
-- Also cleans up any duplicate sessions before adding constraint

DELETE FROM class_sessions a
USING class_sessions b
WHERE a.id > b.id
AND a.class_id = b.class_id
AND a.session_date = b.session_date;

ALTER TABLE class_sessions
ADD CONSTRAINT class_sessions_class_id_session_date_unique
UNIQUE (class_id, session_date);
