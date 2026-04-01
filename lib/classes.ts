import { supabase } from "@/lib/supabaseClient";

export async function getThisWeeksSessions(schoolId: string) {
  // rock_classes.school_id stores the school slug (e.g. "del-mar") — use it directly.
  // Week range: Monday 00:00 through Sunday 23:59 (inclusive)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = monday.toISOString().split("T")[0];
  const weekEnd = sunday.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("class_sessions")
    .select(`
      id,
      session_date,
      start_time,
      status,
      class_instructor_notes,
      instructor_override_user_id,
      rock_classes (
        id,
        name,
        school_id
      )
    `)
    .gte("session_date", weekStart)
    .lte("session_date", weekEnd);

  if (error) {
    console.error("Error loading sessions:", error);
    return [];
  }

  const filtered = (data ?? []).filter(
    (s: any) => s.rock_classes?.school_id === schoolId
  );

  return filtered;
}
