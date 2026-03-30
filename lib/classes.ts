import { supabase } from "@/lib/supabaseClient";

export async function getThisWeeksSessions(schoolId: string) {
  const today = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(today.getDate() + 7);

  const { data, error } = await supabase
    .from("class_sessions")
    .select(`
      id,
      session_date,
      start_time,
      status,
      director_feedback,
      rock_classes (
        id,
        name,
        school_id
      )
    `)
    .gte("session_date", today.toISOString().split("T")[0])
    .lt("session_date", sevenDaysFromNow.toISOString().split("T")[0]);

  if (error) {
    console.error("Error loading sessions:", error);
    return [];
  }

  return (data ?? []).filter(
    (s: any) => s.rock_classes?.school_id === schoolId
  );
}
