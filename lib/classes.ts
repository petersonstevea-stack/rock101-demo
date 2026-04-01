import { supabase } from "@/lib/supabaseClient";

export async function getThisWeeksSessions(schoolId: string) {
  // Resolve slug (e.g. "del-mar") to UUID — currentUser.schoolId is a slug,
  // but rock_classes.school_id stores UUIDs.
  const normalize = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const { data: schools } = await supabase
    .from("schools")
    .select("id, name")
    .eq("is_sandbox", false);

  const matchedSchool = (schools ?? []).find(
    (s) => s.id === schoolId || normalize(s.name) === schoolId
  );
  const resolvedSchoolId = matchedSchool?.id ?? schoolId;

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

  console.log("[getThisWeeksSessions] schoolId in:", schoolId, "→ resolved:", resolvedSchoolId);
  console.log("[getThisWeeksSessions] week range:", weekStart, "→", weekEnd);

  const { data, error } = await supabase
    .from("class_sessions")
    .select(`
      id,
      session_date,
      start_time,
      status,
      director_feedback,
      instructor_override_user_id,
      rock_classes (
        id,
        name,
        school_id
      )
    `)
    .gte("session_date", weekStart)
    .lte("session_date", weekEnd);

  console.log("[getThisWeeksSessions] raw result:", data, error);

  if (error) {
    console.error("Error loading sessions:", error);
    return [];
  }

  const filtered = (data ?? []).filter(
    (s: any) => s.rock_classes?.school_id === resolvedSchoolId
  );

  console.log("[getThisWeeksSessions] filtered sessions:", filtered);

  return filtered;
}
