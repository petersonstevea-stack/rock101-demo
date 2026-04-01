-- Fix rock_classes RLS policies to use updated role values:
--   'gm'       → 'general_manager'
--   'director' → 'music_director'

-- Drop existing policy
DROP POLICY IF EXISTS "Classes can be read by school" ON rock_classes;

-- Recreate with current role values
CREATE POLICY "Classes can be read by school"
ON rock_classes
FOR SELECT
USING (
  school_id IN (
    SELECT school_slug
    FROM staff
    WHERE email = auth.jwt() ->> 'email'
      AND role IN ('owner', 'general_manager', 'music_director', 'instructor')
  )
);
