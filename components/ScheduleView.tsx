"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type StaffMember = { id: string; name: string };

type ScheduleSession = {
  id: string;
  session_date: string;
  status: string;
  instructor_override_user_id: string | null;
  rock_classes: {
    id: string;
    name: string;
    time: string;
    director_email: string;
    school_id: string;
  } | null;
};

type ScheduleViewProps = {
  schoolSlug: string;
};

const WEEKS_PER_PAGE = 12;

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysFromMonday);
  return monday.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysFromMonday);
  return monday.toISOString().slice(0, 10);
}

function formatSessionDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function ScheduleView({ schoolSlug }: ScheduleViewProps) {
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);
  const [schoolStaff, setSchoolStaff] = useState<StaffMember[]>([]);
  const [staffByEmail, setStaffByEmail] = useState<Record<string, string>>({});
  const [weeksToShow, setWeeksToShow] = useState(WEEKS_PER_PAGE);
  const [loading, setLoading] = useState(true);
  const [overrideStates, setOverrideStates] = useState<Record<string, string | null>>({});
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Load sessions + staff for this school slug
  const loadData = useCallback(async () => {
    if (!schoolSlug) return;

    setLoading(true);

    // rock_classes.school_id stores the school slug — use it directly
    const schoolUUID = schoolSlug;

    // Load staff for this school
    const [staffResult, sessionsResult] = await Promise.all([
      supabase
        .from("staff")
        .select("id, name, email")
        .eq("school_slug", schoolSlug)
        .order("name"),
      supabase
        .from("class_sessions")
        .select(`
          id,
          session_date,
          status,
          instructor_override_user_id,
          rock_classes (
            id,
            name,
            time,
            director_email,
            school_id
          )
        `)
        .gte("session_date", new Date().toISOString().slice(0, 10))
        .order("session_date"),
    ]);

    const loadedStaff = (staffResult.data ?? []) as (StaffMember & { email: string })[];
    setSchoolStaff(loadedStaff);

    // Build email → name map for class default director lookup
    const emailMap: Record<string, string> = {};
    for (const s of loadedStaff) {
      emailMap[s.email] = s.name;
    }
    setStaffByEmail(emailMap);

    // Filter to this school's sessions
    const allSessions = (sessionsResult.data ?? []) as unknown as ScheduleSession[];
    const filtered = allSessions.filter(
      (s) => s.rock_classes?.school_id === schoolUUID
    );
    setSessions(filtered);

    // Seed local override state
    const initialOverrides: Record<string, string | null> = {};
    for (const s of filtered) {
      initialOverrides[s.id] = s.instructor_override_user_id;
    }
    setOverrideStates(initialOverrides);

    setLoading(false);
  }, [schoolSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleOverrideChange(sessionId: string, staffId: string | null) {
    setSavingId(sessionId);
    await supabase
      .from("class_sessions")
      .update({ instructor_override_user_id: staffId })
      .eq("id", sessionId);
    setOverrideStates((prev) => ({ ...prev, [sessionId]: staffId }));
    setActiveDropdownId(null);
    setSavingId(null);
  }

  function getInstructorName(session: ScheduleSession): string {
    const overrideId = overrideStates[session.id];
    if (overrideId) {
      return schoolStaff.find((s) => s.id === overrideId)?.name ?? "Unknown";
    }
    const directorEmail = session.rock_classes?.director_email;
    if (directorEmail && staffByEmail[directorEmail]) {
      return staffByEmail[directorEmail];
    }
    return "Not assigned";
  }

  // Group visible sessions by week
  const today = new Date().toISOString().slice(0, 10);
  const cutoffDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + weeksToShow * 7);
    return d.toISOString().slice(0, 10);
  })();

  const visibleSessions = sessions.filter(
    (s) => s.session_date >= today && s.session_date <= cutoffDate
  );

  const totalSessions = sessions.filter((s) => s.session_date >= today);

  // Group by week key
  const weekMap = new Map<string, ScheduleSession[]>();
  for (const session of visibleSessions) {
    const key = getWeekKey(session.session_date);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(session);
  }
  const weeks = Array.from(weekMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  if (loading) {
    return (
      <div className="p-6 text-zinc-400 text-sm">Loading schedule…</div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Schedule</h2>
        <div className="text-sm text-zinc-500">
          {totalSessions.length} upcoming session{totalSessions.length === 1 ? "" : "s"}
        </div>
      </div>

      {weeks.length === 0 ? (
        <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
          No upcoming sessions found for this school.
        </div>
      ) : (
        <div className="space-y-8">
          {weeks.map(([weekKey, weekSessions]) => (
            <div key={weekKey}>
              <div className="mb-3 text-xs uppercase tracking-[0.14em] text-zinc-500">
                Week of {getWeekLabel(weekKey)}
              </div>
              <div className="rounded-none border border-zinc-800 bg-zinc-900 overflow-hidden">
                {weekSessions.map((session, idx) => {
                  const instructorName = getInstructorName(session);
                  const isDropdownOpen = activeDropdownId === session.id;
                  const isSaving = savingId === session.id;
                  const classDefault =
                    staffByEmail[session.rock_classes?.director_email ?? ""] ??
                    "class default";

                  return (
                    <div
                      key={session.id}
                      className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
                        idx < weekSessions.length - 1 ? "border-b border-zinc-800" : ""
                      }`}
                    >
                      {/* Date + class info */}
                      <div className="min-w-0">
                        <div className="font-medium text-white">
                          {formatSessionDate(session.session_date)}
                        </div>
                        <div className="mt-0.5 text-sm text-zinc-400">
                          {session.rock_classes?.name ?? "Unknown class"}
                          {session.rock_classes?.time
                            ? ` · ${session.rock_classes.time}`
                            : ""}
                        </div>
                      </div>

                      {/* Instructor + change control */}
                      <div className="flex items-center gap-3 shrink-0">
                        {!isDropdownOpen ? (
                          <>
                            <span className="text-sm text-zinc-300">{instructorName}</span>
                            <button
                              type="button"
                              onClick={() => setActiveDropdownId(session.id)}
                              className="rounded-none bg-zinc-700 px-3 py-1 text-xs text-white hover:bg-zinc-600"
                            >
                              Change
                            </button>
                          </>
                        ) : (
                          <>
                            <select
                              className="rounded-none border border-zinc-700 bg-black px-3 py-1.5 text-sm text-white"
                              defaultValue={overrideStates[session.id] ?? ""}
                              onChange={(e) =>
                                handleOverrideChange(session.id, e.target.value || null)
                              }
                              disabled={isSaving}
                              autoFocus
                            >
                              <option value="">Use class default ({classDefault})</option>
                              {schoolStaff.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setActiveDropdownId(null)}
                              className="text-xs text-zinc-500 hover:text-zinc-300"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {totalSessions.length > visibleSessions.length && (
            <button
              type="button"
              onClick={() => setWeeksToShow((prev) => prev + WEEKS_PER_PAGE)}
              className="rounded-none bg-zinc-800 px-5 py-3 text-sm text-white hover:bg-zinc-700"
            >
              Show more ({totalSessions.length - visibleSessions.length} more session
              {totalSessions.length - visibleSessions.length === 1 ? "" : "s"})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
