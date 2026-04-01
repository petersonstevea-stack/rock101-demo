"use client";

import { useState, useEffect } from "react";
import { RockClass } from "@/types/class";
import { AppUser } from "@/types/user";
import { supabase } from "@/lib/supabaseClient";
import PageHero from "@/components/PageHero";
import {
  SONG_READINESS_LEVELS,
  type SongReadinessValue,
} from "@/types/songReadiness";

type Student = {
  id?: string;
  name: string;
  instrument?: string;
  band?: string;
  schoolId?: string;
};

type ClassDetailViewProps = {
  rockClass: RockClass;
  selectedSessionId?: string | null;
  selectedSession?: any | null;
  students: Student[];
  users: AppUser[];
  allStudents: Student[];
  currentUserRole: string;
  currentUserStaffId?: string;
  schoolSlug: string;
  onBackToClasses: () => void;
  onDeleteClass: () => void;
  onEditClass: () => void;
  onSelectStudent: (studentName: string) => void;
  onAddStudentToClass: (studentId: string) => void;
  onRemoveStudentFromClass: (studentId: string) => void;
  onUpdateSongProgress: (song: string, readiness: SongReadinessValue) => void;
  directorFeedback: string;
  onDirectorFeedbackChange: (value: string) => void;
  onSaveDirectorFeedback: () => Promise<boolean>;
};

function getSongReadinessLabel(readiness?: number) {
  if (!readiness || readiness < 1 || readiness > SONG_READINESS_LEVELS.length) {
    return SONG_READINESS_LEVELS[0];
  }

  return SONG_READINESS_LEVELS[readiness - 1];
}

export default function ClassDetailView({
  rockClass,
  selectedSessionId,
  selectedSession,
  students,
  users,
  allStudents,
  currentUserRole,
  currentUserStaffId,
  schoolSlug,
  onBackToClasses,
  onDeleteClass,
  onEditClass,
  onSelectStudent,
  onAddStudentToClass,
  onRemoveStudentFromClass,
  onUpdateSongProgress,
  directorFeedback,
  onDirectorFeedbackChange,
  onSaveDirectorFeedback,
}: ClassDetailViewProps) {
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitConfirmedAt, setSubmitConfirmedAt] = useState<string | null>(null);
  const [schoolStaff, setSchoolStaff] = useState<{ id: string; name: string }[]>([]);
  const [overrideUserId, setOverrideUserId] = useState<string | null>(null);
  const [showOverrideDropdown, setShowOverrideDropdown] = useState(false);
  const [overrideSaving, setOverrideSaving] = useState(false);

  // Load school staff for instructor override dropdown
  useEffect(() => {
    if (!schoolSlug) return;
    supabase
      .from("staff")
      .select("id, name")
      .eq("school_slug", schoolSlug)
      .order("name")
      .then(({ data }) => {
        if (data) setSchoolStaff(data as { id: string; name: string }[]);
      });
  }, [schoolSlug]);

  // Sync override from session when session changes
  useEffect(() => {
    setOverrideUserId(selectedSession?.instructor_override_user_id ?? null);
    setShowOverrideDropdown(false);
  }, [selectedSession]);

  async function handleInstructorOverrideChange(staffId: string | null) {
    if (!selectedSessionId) return;
    setOverrideSaving(true);
    await supabase
      .from("class_sessions")
      .update({ instructor_override_user_id: staffId })
      .eq("id", selectedSessionId);
    setOverrideUserId(staffId);
    setShowOverrideDropdown(false);
    setOverrideSaving(false);
  }

  // Pike 13 integration (Phase 6): attendance will be
  // pre-populated from Pike 13 event occurrence data.
  // group_class_absent will be set automatically when
  // pike13_event_occurrence_id is synced.
  useEffect(() => {
    if (!selectedSessionId) return;
    supabase
      .from("session_student_signoffs")
      .select("student_id, group_class_absent")
      .eq("session_id", selectedSessionId)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, boolean> = {};
        for (const row of data) {
          map[row.student_id] = row.group_class_absent;
        }
        setAttendanceMap(map);
      });
  }, [selectedSessionId]);

  async function handleAttendanceToggle(studentId: string, newIsPresent: boolean) {
    if (!selectedSessionId) return;
    const group_class_absent = !newIsPresent;
    setAttendanceMap((prev) => ({ ...prev, [studentId]: group_class_absent }));
    setAttendanceSaving(true);
    await supabase.from("session_student_signoffs").upsert(
      { session_id: selectedSessionId, student_id: studentId, group_class_absent },
      { onConflict: "session_id,student_id" }
    );
    setAttendanceSaving(false);
  }

  async function handleFullSubmit() {
    if (!selectedSessionId) return;
    setSubmitLoading(true);

    // Step 1: Save note
    await onSaveDirectorFeedback();

    // Step 2: Upsert session_student_signoffs for all students
    const now = new Date().toISOString();
    const studentIds = rockClass.studentIds;

    await supabase.from("session_student_signoffs").upsert(
      studentIds.map((studentId) => ({
        session_id: selectedSessionId,
        student_id: studentId,
        class_instructor_submitted: true,
        class_instructor_submitted_at: now,
      })),
      { onConflict: "session_id,student_id" }
    );

    // Step 3: Merge classInstructorSubmitted into students.workflow
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, workflow")
      .in("id", studentIds);

    if (studentsData) {
      await Promise.all(
        studentsData.map((s) =>
          supabase
            .from("students")
            .update({ workflow: { ...(s.workflow || {}), classInstructorSubmitted: true } })
            .eq("id", s.id)
        )
      );
    }

    setSubmitLoading(false);
    setSubmitConfirmedAt(
      new Date().toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    );
  }

  const directorName =
    users.find((user) => user.email === rockClass.directorEmail)?.name ||
    rockClass.directorEmail ||
    "Not assigned";

  const displayInstructorName = overrideUserId
    ? (schoolStaff.find((s) => s.id === overrideUserId)?.name ?? directorName)
    : directorName;

  const canOverrideInstructor =
    currentUserRole === "owner" ||
    currentUserRole === "gm" ||
    currentUserRole === "director";

  // Edit/Delete: owner, GM, or the assigned class instructor (by directorUserId or session override)
  const canEditOrDeleteClass =
    currentUserRole === "owner" ||
    currentUserRole === "gm" ||
    (!!currentUserStaffId && (
      rockClass.directorUserId === currentUserStaffId ||
      selectedSession?.instructor_override_user_id === currentUserStaffId
    ));

  const availableStudents = allStudents.filter(
    (student) =>
      student.schoolId === rockClass.schoolId &&
      student.id &&
      !rockClass.studentIds.includes(student.id)
  );

  const scheduleSubtitle = rockClass.dayOfWeek
    ? `${rockClass.dayOfWeek}s at ${rockClass.time || "Time not set"}`
    : rockClass.time || "Time not set";

  const metaSegments: string[] = [];
  if (displayInstructorName && displayInstructorName !== "Not assigned") {
    metaSegments.push(displayInstructorName);
  }
  if (rockClass.performanceDate) {
    const formatted = new Date(rockClass.performanceDate + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    metaSegments.push(`Show Date: ${formatted}`);
  }
  metaSegments.push(`${rockClass.studentNames.length} Students`);
  const heroMeta = metaSegments.join(" · ");

  const sessionDateLabel = selectedSession?.session_date
    ? new Date(selectedSession.session_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToClasses}
          className="rounded-none bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
        >
          Back to Classes
        </button>

        {canEditOrDeleteClass && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEditClass}
              className="rounded-none bg-[#cc0000] px-4 py-2 text-white hover:bg-[#b30000]"
            >
              Edit Class
            </button>

            <button
              type="button"
              onClick={onDeleteClass}
              className="rounded-none bg-zinc-700 px-4 py-2 text-white hover:bg-zinc-600"
            >
              Delete Class
            </button>
          </div>
        )}
      </div>

      <PageHero
        title={rockClass.name}
        subtitle={scheduleSubtitle}
        meta={heroMeta}
        topRight={
          sessionDateLabel ? (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-white" style={{ opacity: 0.45 }}>
                Session
              </div>
              <div className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-oswald)", opacity: 0.85 }}>
                {sessionDateLabel}
              </div>
            </div>
          ) : undefined
        }
        imageSrc="/images/rock101-drums.jpg"
      />

      {canOverrideInstructor && selectedSessionId && (
        <div className="flex items-center gap-3 rounded-none border border-zinc-800 bg-zinc-900 px-5 py-3">
          {!showOverrideDropdown ? (
            <>
              <span className="text-sm text-zinc-400">Instructor:</span>
              <span className="text-sm text-white">{displayInstructorName}</span>
              <button
                type="button"
                onClick={() => setShowOverrideDropdown(true)}
                className="rounded-none bg-zinc-700 px-3 py-1 text-xs text-white hover:bg-zinc-600"
              >
                Change
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-zinc-400">Instructor:</span>
              <select
                className="rounded-none border border-zinc-700 bg-black px-3 py-1.5 text-sm text-white"
                defaultValue={overrideUserId ?? ""}
                onChange={(e) => handleInstructorOverrideChange(e.target.value || null)}
                disabled={overrideSaving}
                autoFocus
              >
                <option value="">Use class default ({directorName})</option>
                {schoolStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowOverrideDropdown(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Class Instructor Notes + Attendance — first in DOM = top on mobile, right on desktop */}
        <div className="order-1 md:order-2 space-y-6">
          <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
            <h3 className="text-xl font-semibold text-white">Class Instructor Notes</h3>

            <div className="mt-4">
              <textarea
                value={directorFeedback}
                onChange={(e) => onDirectorFeedbackChange(e.target.value)}
                placeholder="Add weekly class-level feedback here..."
                className="min-h-[140px] w-full rounded-none border border-zinc-700 bg-black px-4 py-3 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  const didSave = await onSaveDirectorFeedback();

                  if (!didSave) return;

                  setLastSavedAt(
                    new Date().toLocaleString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })
                  );
                  setTimeout(() => setLastSavedAt(null), 4000);
                }}
                className="rounded-none bg-[#cc0000] px-4 py-2 text-white hover:bg-[#b30000]"
              >
                Save Note
              </button>

              {lastSavedAt && (
                <span className="text-sm text-zinc-400 opacity-80">
                  Note saved · {lastSavedAt}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Class Attendance</h3>
              {attendanceSaving && (
                <span className="text-xs text-zinc-400">Saving…</span>
              )}
            </div>

            {!selectedSessionId ? (
              <p className="mt-4 text-sm text-zinc-500">Select a session to track attendance.</p>
            ) : students.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No students in this class.</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                {students.filter((s) => s.id).map((student) => {
                  const isPresent = !(attendanceMap[student.id!] ?? false);
                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between rounded-none border border-zinc-800 bg-zinc-950 px-4 py-3"
                    >
                      <span className="text-sm text-white">{student.name}</span>
                      <label className="flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={isPresent}
                          onChange={(e) => handleAttendanceToggle(student.id!, e.target.checked)}
                          className="h-4 w-4 rounded-none accent-[#cc0000]"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Song Progress — second in DOM = below on mobile, left on desktop */}
        <div className="order-2 md:order-1">
          <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
            <h3 className="text-xl font-semibold text-white">Song Progress</h3>

            {rockClass.songs.length > 0 ? (
              <div className="mt-4 space-y-4">
                {rockClass.songs.map((song) => {
                  const readiness =
                    rockClass.songProgress?.[song]?.readiness ?? 1;

                  return (
                    <div
                      key={song}
                      className="rounded-none border border-zinc-800 bg-zinc-950 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-semibold text-white">{song}</div>
                        </div>

                        <div className="w-full md:max-w-md">
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={readiness}
                            onChange={(e) =>
                              onUpdateSongProgress(
                                song,
                                Number(e.target.value) as SongReadinessValue
                              )
                            }
                            className="w-full"
                            style={{ accentColor: "#cc0000" }}
                          />
                          <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                            <span>Just Starting</span>
                            <span>Show Ready</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 text-zinc-200">No songs assigned</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-xl font-semibold text-white">Student Roster</h3>

        <div className="mb-6 mt-4">
          <div className="mb-2 text-sm text-zinc-400">Add Student to Class</div>

          {availableStudents.length === 0 ? (
            <div className="text-sm text-zinc-500">
              No additional students available for this school.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => onAddStudentToClass(student.id!)}
                  className="rounded-none bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"
                >
                  + {student.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {students.length === 0 ? (
          <p className="mt-4 text-zinc-300">No students assigned to this class.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {students.map((student) => (
              <div
                key={student.id ?? student.name}
                className="rounded-none border border-zinc-800 bg-zinc-950 p-4"
              >
                <div className="text-lg font-semibold text-white">
                  {student.name}
                </div>

                <div className="mt-2 text-sm text-zinc-300">
                  Instrument: {student.instrument || "Not set"}
                </div>

                <div className="mt-1 text-sm text-zinc-400">
                  Band: {student.band || "Not set"}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectStudent(student.name)}
                    className="rounded-none bg-[#cc0000] px-4 py-2 text-white hover:bg-[#b30000]"
                  >
                    Open Progress
                  </button>

                  {student.id ? (
                    <button
                      type="button"
                      onClick={() => onRemoveStudentFromClass(student.id!)}
                      className="rounded-none bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
        <button
          type="button"
          disabled={submitLoading || !selectedSessionId}
          onClick={handleFullSubmit}
          className="w-full rounded-none bg-[#cc0000] px-4 py-3 text-white hover:bg-[#b30000] disabled:opacity-50"
        >
          {submitLoading ? "Submitting…" : "Submit Class Instructor Feedback"}
        </button>

        {submitConfirmedAt && (
          <p className="mt-3 text-sm text-zinc-300">
            Class instructor feedback submitted · {submitConfirmedAt}
          </p>
        )}
      </div>
    </div>
  );
}