"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AppUser } from "@/types/user";
import {
    INSTRUMENT_OPTIONS,
} from "@/data/reference/enrollmentOptions";

function generateTimeOptions(): string[] {
    const options: string[] = [];
    for (let hour = 8; hour <= 22; hour++) {
        for (let min = 0; min < 60; min += 15) {
            if (hour === 22 && min > 0) break;
            const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            const ampm = hour >= 12 ? "PM" : "AM";
            const minStr = min === 0 ? "00" : String(min);
            options.push(`${h12}:${minStr} ${ampm}`);
        }
    }
    return options;
}

const TIME_OPTIONS = generateTimeOptions();

function formatTime(time: string | null): string {
  if (!time) return "Time not set";
  const [hours, minutes] = time.split(":");
  const h = Number(hours);
  const m = String(minutes).padStart(2, "0");
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${suffix}`;
}

function formatSessionDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const DAY_OPTIONS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];


type StudentRow = {
    id: string;
    first_name: string;
    last_initial: string | null;
    program: string | null;
};

type EnrollmentRow = {
    id: string;
    student_id: string;
    instructor_id: string | null;
    instrument: string;
    program: string;
    day_of_week: string;
    start_time: string;
    active: boolean;
    is_single_session: boolean;
    students: { first_name: string; last_initial: string | null } | null;
};

type SessionRow = {
    id: string;
    session_date: string;
    status: string;
    instructor_id: string | null;
    instructor_override_id: string | null;
    is_makeup: boolean;
};

type StudentLessonRow = {
    studentId: string;
    studentName: string;
    enrollments: EnrollmentRow[];
};

type MergedSessionRow = {
    id: string;
    session_date: string;
    status: string;
    instructor_id: string | null;
    instructor_override_id: string | null;
    is_makeup: boolean;
    instrument: string;
    enrollment_id: string;
    is_single_session: boolean;
};

type ChangeInstructorState = {
    sessionId: string;
    sessionDate: string;
    enrollmentId: string;
    scope: "single" | "future" | null;
};

type CancelState = {
    sessionId: string;
    sessionDate: string;
    enrollmentId: string;
    scope: "single" | "future" | null;
};

type RescheduleState = {
    sessionId: string;
    sessionDate: string;
    enrollmentId: string;
};

type LessonSetupViewProps = {
    schoolId: string;
    users: AppUser[];
    mode?: "create" | "manage";
    onNavigateToManage?: () => void;
};

const inputClass = "w-full rounded-none border border-zinc-700 bg-black px-4 py-3 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none";
const labelClass = "mb-2 block text-sm text-zinc-400";
const smallBtnClass = "rounded-none px-2.5 py-1 text-xs font-medium text-white transition";

export default function LessonSetupView({ schoolId, users, mode = "create", onNavigateToManage }: LessonSetupViewProps) {
    // Form state
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [instructorId, setInstructorId] = useState("");
    const [instrument, setInstrument] = useState("");
    const [dayOfWeek, setDayOfWeek] = useState("Monday");
    const [startTime, setStartTime] = useState("");
    const [firstSessionDate, setFirstSessionDate] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");

    // Enrollments list
    const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
    const [studentRows, setStudentRows] = useState<StudentLessonRow[]>([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState(true);

    // Session management state
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
    const [enrollmentSessions, setEnrollmentSessions] = useState<Record<string, MergedSessionRow[]>>({});
    const [loadingSessions, setLoadingSessions] = useState<string | null>(null);
    const [changingInstructor, setChangingInstructor] = useState<ChangeInstructorState | null>(null);
    const [selectedOverrideInstructorId, setSelectedOverrideInstructorId] = useState("");
    const [cancelling, setCancelling] = useState<CancelState | null>(null);
    const [rescheduling, setRescheduling] = useState<RescheduleState | null>(null);
    const [rescheduleDate, setRescheduleDate] = useState("");

    // Create form — session type
    const [isSingleSession, setIsSingleSession] = useState(false);
    const [isMakeup, setIsMakeup] = useState(false);

    useEffect(() => {
        if (!schoolId) return;
        loadStudents();
        loadEnrollments();
    }, [schoolId]);

    async function loadStudents() {
        const { data } = await supabase
            .from("students")
            .select("id, first_name, last_initial, program")
            .eq("school_id", schoolId)
            .eq("active", true)
            .order("first_name");
        setStudents((data ?? []) as StudentRow[]);
    }

    async function loadEnrollments() {
        setLoadingEnrollments(true);
        const { data } = await supabase
            .from("private_lesson_enrollments")
            .select("id, student_id, instructor_id, instrument, program, day_of_week, start_time, active, is_single_session, students(first_name, last_initial)")
            .eq("school_id", schoolId)
            .eq("active", true)
            .order("day_of_week");
        const rows = (data ?? []) as unknown as EnrollmentRow[];
        setEnrollments(rows);

        // Group by student
        const studentMap: Record<string, StudentLessonRow> = {};
        for (const e of rows) {
            if (!studentMap[e.student_id]) {
                const s = e.students;
                const name = s ? `${s.first_name} ${s.last_initial ?? ""}`.trim() : e.student_id;
                studentMap[e.student_id] = { studentId: e.student_id, studentName: name, enrollments: [] };
            }
            studentMap[e.student_id].enrollments.push(e);
        }
        const sorted = Object.values(studentMap).sort((a, b) =>
            a.studentName.localeCompare(b.studentName)
        );
        setStudentRows(sorted);
        setLoadingEnrollments(false);
    }

    async function loadSessionsForStudent(studentId: string, studentEnrollments: EnrollmentRow[]) {
        setLoadingSessions(studentId);
        const today = new Date().toISOString().slice(0, 10);
        const results = await Promise.all(
            studentEnrollments.map((e) =>
                supabase
                    .from("private_lesson_sessions")
                    .select("id, session_date, status, instructor_id, instructor_override_id, is_makeup")
                    .eq("enrollment_id", e.id)
                    .eq("status", "scheduled")
                    .gte("session_date", today)
                    .order("session_date")
                    .limit(12)
                    .then(({ data }) =>
                        (data ?? []).map((s) => ({
                            ...s,
                            instrument: e.instrument,
                            enrollment_id: e.id,
                            is_single_session: e.is_single_session,
                        } as MergedSessionRow))
                    )
            )
        );
        const merged = results.flat().sort((a, b) => a.session_date.localeCompare(b.session_date));
        setEnrollmentSessions((prev) => ({ ...prev, [studentId]: merged }));
        setLoadingSessions(null);
    }

    function toggleExpand(studentId: string, studentEnrollments: EnrollmentRow[]) {
        if (expandedStudentId === studentId) {
            setExpandedStudentId(null);
            setChangingInstructor(null);
            setCancelling(null);
        } else {
            setExpandedStudentId(studentId);
            setChangingInstructor(null);
            setCancelling(null);
            if (!enrollmentSessions[studentId]) {
                loadSessionsForStudent(studentId, studentEnrollments);
            }
        }
    }

    async function handleChangeInstructor(scope: "single" | "future") {
        if (!changingInstructor) return;
        const { sessionId, sessionDate, enrollmentId } = changingInstructor;
        const overrideId = selectedOverrideInstructorId || null;

        if (scope === "single") {
            await supabase
                .from("private_lesson_sessions")
                .update({ instructor_override_id: overrideId })
                .eq("id", sessionId);
        } else {
            await supabase
                .from("private_lesson_sessions")
                .update({ instructor_override_id: overrideId })
                .eq("enrollment_id", enrollmentId)
                .gte("session_date", sessionDate);
        }

        setChangingInstructor(null);
        setSelectedOverrideInstructorId("");
        if (expandedStudentId) {
            const sr = studentRows.find((r) => r.studentId === expandedStudentId);
            if (sr) await loadSessionsForStudent(expandedStudentId, sr.enrollments);
        }
    }

    async function handleCancel(scope: "single" | "future") {
        if (!cancelling) return;
        const { sessionId, sessionDate, enrollmentId } = cancelling;

        if (scope === "single") {
            await supabase
                .from("private_lesson_sessions")
                .update({ status: "cancelled" })
                .eq("id", sessionId);
        } else {
            await supabase
                .from("private_lesson_sessions")
                .update({ status: "cancelled" })
                .eq("enrollment_id", enrollmentId)
                .gte("session_date", sessionDate);
        }

        setCancelling(null);
        if (expandedStudentId) {
            const sr = studentRows.find((r) => r.studentId === expandedStudentId);
            if (sr) await loadSessionsForStudent(expandedStudentId, sr.enrollments);
        }
    }

    async function handleReschedule() {
        if (!rescheduling || !rescheduleDate) return;
        const { sessionId, sessionDate } = rescheduling;

        const { error } = await supabase
            .from("private_lesson_sessions")
            .update({
                session_date: rescheduleDate,
                rescheduled_from: sessionDate,
            })
            .eq("id", sessionId);

        if (error) {
            alert(`Error rescheduling session: ${error.message}`);
            return;
        }

        setRescheduling(null);
        setRescheduleDate("");
        if (expandedStudentId) {
            const sr = studentRows.find((r) => r.studentId === expandedStudentId);
            if (sr) await loadSessionsForStudent(expandedStudentId, sr.enrollments);
        }
    }

    const filteredStudents = useMemo(() => {
        if (!studentSearch.trim()) return students;
        const q = studentSearch.toLowerCase();
        return students.filter((s) =>
            s.first_name.toLowerCase().includes(q) ||
            (s.last_initial ?? "").toLowerCase().includes(q)
        );
    }, [students, studentSearch]);

    const instructorUsers = users.filter(
        (u) => u.role === "instructor" || u.role === "music_director" || u.role === "general_manager" || u.role === "owner"
    );

    const firstSessionPreview = useMemo(() => {
        if (!firstSessionDate) return null;
        const d = new Date(firstSessionDate + "T00:00:00");
        const dayName = DAY_NAMES[d.getDay()];
        const formatted = d.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
        const timePart = startTime ? ` at ${startTime}` : "";
        if (isSingleSession) {
            return `${dayName}${timePart} — 1 session on ${formatted}`;
        }
        return `${dayName}s${timePart} — generating 104 sessions from ${formatted}`;
    }, [firstSessionDate, startTime, isSingleSession]);

    function resetForm() {
        setSelectedStudentId("");
        setStudentSearch("");
        setInstructorId("");
        setInstrument("");
        setDayOfWeek("Monday");
        setStartTime("");
        setFirstSessionDate("");
        setSaveMessage("");
        setIsSingleSession(false);
        setIsMakeup(false);
    }

    async function handleSave() {
        if (!selectedStudentId) { alert("Please select a student."); return; }
        if (!instructorId) { alert("Please select an instructor."); return; }
        if (!instrument) { alert("Please select an instrument."); return; }
        if (!firstSessionDate) { alert("Please select a first session date."); return; }

        setSaving(true);
        setSaveMessage("");

        const enrollmentId = crypto.randomUUID();
        const derivedDay = DAY_NAMES[new Date(firstSessionDate + "T00:00:00").getDay()];
        const selectedStudent = students.find((s) => s.id === selectedStudentId);
        const derivedProgram = selectedStudent?.program ?? "rock101";

        const { error: enrollError } = await supabase
            .from("private_lesson_enrollments")
            .insert({
                id: enrollmentId,
                school_id: schoolId,
                student_id: selectedStudentId,
                instructor_id: instructorId,
                instrument,
                program: derivedProgram,
                day_of_week: derivedDay,
                start_time: startTime,
                first_session_date: firstSessionDate,
                active: true,
                is_single_session: isSingleSession,
            });

        if (enrollError) {
            alert(`Error saving enrollment: ${enrollError.message}`);
            setSaving(false);
            return;
        }

        if (isSingleSession) {
            // Generate exactly 1 session
            const { error: sessionError } = await supabase
                .from("private_lesson_sessions")
                .insert({
                    enrollment_id: enrollmentId,
                    student_id: selectedStudentId,
                    instructor_id: instructorId,
                    session_date: firstSessionDate,
                    status: "scheduled",
                    is_makeup: isMakeup,
                });
            if (sessionError) {
                setSaving(false);
                setSaveMessage("Enrollment saved but session generation failed: " + sessionError.message);
                await loadEnrollments();
                return;
            }
            setSaving(false);
            setSaveMessage("Enrollment created · 1 session generated");
        } else {
            // Generate 104 weekly sessions in batches of 20
            const sessionDates: string[] = [];
            for (let i = 0; i < 104; i++) {
                const d = new Date(firstSessionDate + "T00:00:00");
                d.setDate(d.getDate() + i * 7);
                sessionDates.push(d.toISOString().slice(0, 10));
            }

            const batchSize = 20;
            for (let i = 0; i < sessionDates.length; i += batchSize) {
                const batch = sessionDates.slice(i, i + batchSize);
                const { error: batchError } = await supabase
                    .from("private_lesson_sessions")
                    .insert(
                        batch.map((date) => ({
                            enrollment_id: enrollmentId,
                            student_id: selectedStudentId,
                            instructor_id: instructorId,
                            session_date: date,
                            status: "scheduled",
                        }))
                    );
                if (batchError) {
                    setSaving(false);
                    setSaveMessage("Enrollment saved but session generation failed: " + batchError.message);
                    await loadEnrollments();
                    return;
                }
            }
            setSaving(false);
            setSaveMessage("Enrollment created · 104 sessions generated");
        }

        resetForm();
        await loadEnrollments();
    }

    async function handleDeactivate(enrollmentId: string) {
        const { error } = await supabase
            .from("private_lesson_enrollments")
            .update({ active: false })
            .eq("id", enrollmentId);
        if (error) {
            alert(`Error deactivating: ${error.message}`);
            return;
        }
        await loadEnrollments();
    }

    async function handleDeactivateAll(studentEnrollments: EnrollmentRow[]) {
        for (const e of studentEnrollments) {
            await supabase
                .from("private_lesson_enrollments")
                .update({ active: false })
                .eq("id", e.id);
        }
        await loadEnrollments();
    }

    function resolveInstructorName(session: MergedSessionRow, enrollmentInstructorId: string | null): string {
        const overrideId = session.instructor_override_id;
        const effectiveId = overrideId ?? enrollmentInstructorId;
        if (!effectiveId) return "—";
        const user = users.find((u) => u.id === effectiveId);
        const name = user?.name ?? effectiveId;
        return overrideId ? `${name} (override)` : name;
    }

    function renderSessionManagement(studentId: string, studentEnrollments: EnrollmentRow[]) {
        const sessions = enrollmentSessions[studentId] ?? [];
        const isLoading = loadingSessions === studentId;

        return (
            <div className="mt-3 border-t border-zinc-800 pt-3">
                {isLoading ? (
                    <div className="text-zinc-500 text-xs">Loading sessions…</div>
                ) : sessions.length === 0 ? (
                    <div className="text-zinc-500 text-xs">No upcoming scheduled sessions.</div>
                ) : (
                    <div className="grid gap-2">
                        {sessions.map((session) => {
                            const sessionEnrollment = studentEnrollments.find((e) => e.id === session.enrollment_id);
                            const instructorName = resolveInstructorName(session, sessionEnrollment?.instructor_id ?? null);
                            const isChanging = changingInstructor?.sessionId === session.id;
                            const isCancelling = cancelling?.sessionId === session.id;
                            const isRescheduling = rescheduling?.sessionId === session.id;

                            return (
                                <div key={session.id} className="bg-[#111111] rounded-none px-3 py-2.5">
                                    {/* Session header row */}
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-white text-xs font-medium">
                                                {formatSessionDate(session.session_date)}
                                            </span>
                                            <span
                                                className="rounded-none px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white bg-zinc-700"
                                            >
                                                {session.instrument}
                                            </span>
                                            <span className="text-zinc-500 text-xs">{instructorName}</span>
                                            <span
                                                className="rounded-none px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                                                style={{
                                                    backgroundColor: session.status === "scheduled" ? "#1a1a1a" : "#3f3f3f",
                                                    color: session.status === "scheduled" ? "#a1a1aa" : "#ef4444",
                                                    border: "1px solid #3f3f3f",
                                                }}
                                            >
                                                {session.status === "scheduled" ? "Scheduled" : "Cancelled"}
                                            </span>
                                            {session.is_makeup && (
                                                <span
                                                    className="rounded-none px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white bg-zinc-600"
                                                >
                                                    Makeup
                                                </span>
                                            )}
                                        </div>
                                        {!isChanging && !isCancelling && !isRescheduling && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCancelling(null);
                                                        setRescheduling(null);
                                                        setChangingInstructor({
                                                            sessionId: session.id,
                                                            sessionDate: session.session_date,
                                                            enrollmentId: session.enrollment_id,
                                                            scope: null,
                                                        });
                                                        setSelectedOverrideInstructorId(session.instructor_override_id ?? "");
                                                    }}
                                                    className={`${smallBtnClass} bg-zinc-700 hover:bg-zinc-600`}
                                                >
                                                    Change Instructor
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setChangingInstructor(null);
                                                        setCancelling(null);
                                                        setRescheduling({
                                                            sessionId: session.id,
                                                            sessionDate: session.session_date,
                                                            enrollmentId: session.enrollment_id,
                                                        });
                                                        setRescheduleDate("");
                                                    }}
                                                    className={`${smallBtnClass} bg-zinc-700 hover:bg-zinc-600`}
                                                >
                                                    Reschedule
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setChangingInstructor(null);
                                                        setRescheduling(null);
                                                        setCancelling({
                                                            sessionId: session.id,
                                                            sessionDate: session.session_date,
                                                            enrollmentId: session.enrollment_id,
                                                            scope: null,
                                                        });
                                                    }}
                                                    className={`${smallBtnClass} bg-zinc-800 hover:bg-zinc-700`}
                                                    style={{ color: "#ef4444" }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Change instructor flow */}
                                    {isChanging && (
                                        <div className="mt-2 space-y-2">
                                            {changingInstructor!.scope === null ? (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-zinc-400 text-xs">Change for:</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setChangingInstructor((prev) => prev ? { ...prev, scope: "single" } : null)}
                                                        className={`${smallBtnClass} bg-[#cc0000] hover:bg-[#b30000]`}
                                                    >
                                                        Just this session
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setChangingInstructor((prev) => prev ? { ...prev, scope: "future" } : null)}
                                                        className={`${smallBtnClass} bg-zinc-700 hover:bg-zinc-600`}
                                                    >
                                                        This and all future sessions
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setChangingInstructor(null)}
                                                        className="text-zinc-500 text-xs hover:text-white"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <select
                                                        value={selectedOverrideInstructorId}
                                                        onChange={(e) => setSelectedOverrideInstructorId(e.target.value)}
                                                        className="rounded-none border border-zinc-700 bg-black px-3 py-1.5 text-white text-xs focus:outline-none"
                                                    >
                                                        <option value="">Use enrollment default</option>
                                                        {instructorUsers.filter((u) => u.id).map((u) => (
                                                            <option key={u.id} value={u.id!}>{u.name}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChangeInstructor(changingInstructor!.scope!)}
                                                        className={`${smallBtnClass} bg-[#cc0000] hover:bg-[#b30000]`}
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setChangingInstructor(null)}
                                                        className="text-zinc-500 text-xs hover:text-white"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Reschedule flow */}
                                    {isRescheduling && (
                                        <div className="mt-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <input
                                                    type="date"
                                                    value={rescheduleDate}
                                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                                    className="rounded-none border border-zinc-700 bg-black px-3 py-1.5 text-white text-xs focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleReschedule}
                                                    disabled={!rescheduleDate}
                                                    className={`${smallBtnClass} bg-[#cc0000] hover:bg-[#b30000] disabled:opacity-50`}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setRescheduling(null); setRescheduleDate(""); }}
                                                    className="text-zinc-500 text-xs hover:text-white"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Cancel flow */}
                                    {isCancelling && (
                                        <div className="mt-2">
                                            {cancelling!.scope === null ? (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-zinc-400 text-xs">Cancel:</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCancel("single")}
                                                        className={`${smallBtnClass} bg-[#cc0000] hover:bg-[#b30000]`}
                                                    >
                                                        Just this session
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCancel("future")}
                                                        className={`${smallBtnClass} bg-zinc-700 hover:bg-zinc-600`}
                                                    >
                                                        This and all future sessions
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCancelling(null)}
                                                        className="text-zinc-500 text-xs hover:text-white"
                                                    >
                                                        Back
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">

            {/* SECTION 1 — CREATE ENROLLMENT */}
            {mode === "create" && <div className="bg-[#111111] rounded-none p-5">
                <h2 className="sor-display text-3xl md:text-4xl leading-none">
                    <span style={{ color: "#cc0000" }}>CREATE</span>
                    <span className="ml-2 text-white italic normal-case">Enrollment</span>
                </h2>
                <div className="sor-divider" />

                <div className="grid gap-4 md:grid-cols-2">

                    {/* Student */}
                    <div className="md:col-span-2">
                        <label className={labelClass}>Student</label>
                        <div className="relative mb-2">
                            <input
                                type="text"
                                value={studentSearch}
                                onChange={(e) => setStudentSearch(e.target.value)}
                                placeholder="Search students..."
                                className={inputClass}
                            />
                            {studentSearch && (
                                <button
                                    type="button"
                                    onClick={() => setStudentSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                                >✕</button>
                            )}
                        </div>
                        <select
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className={inputClass}
                        >
                            <option value="">Select student</option>
                            {filteredStudents.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {`${s.first_name} ${s.last_initial ?? ""}`.trim()}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Session type toggle */}
                    <div className="md:col-span-2">
                        <label className={labelClass}>Session Type</label>
                        <div className="flex">
                            <button
                                type="button"
                                onClick={() => { setIsSingleSession(false); setIsMakeup(false); }}
                                className={`rounded-none px-4 py-2.5 text-sm font-medium transition ${!isSingleSession ? "bg-[#cc0000] text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
                            >
                                Recurring (weekly)
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsSingleSession(true)}
                                className={`rounded-none px-4 py-2.5 text-sm font-medium transition ${isSingleSession ? "bg-[#cc0000] text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
                            >
                                Single Session
                            </button>
                        </div>
                    </div>

                    {/* Instructor */}
                    <div>
                        <label className={labelClass}>Instructor</label>
                        <select
                            value={instructorId}
                            onChange={(e) => setInstructorId(e.target.value)}
                            className={inputClass}
                        >
                            <option value="">Select instructor</option>
                            {instructorUsers.filter((u) => u.id).map((u) => (
                                <option key={u.id} value={u.id!}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Instrument */}
                    <div>
                        <label className={labelClass}>Instrument</label>
                        <select
                            value={instrument}
                            onChange={(e) => setInstrument(e.target.value)}
                            className={inputClass}
                        >
                            <option value="">Select instrument</option>
                            {INSTRUMENT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Day of week — recurring only */}
                    {!isSingleSession && (
                        <div>
                            <label className={labelClass}>Day of Week</label>
                            <select
                                value={dayOfWeek}
                                onChange={(e) => setDayOfWeek(e.target.value)}
                                className={inputClass}
                            >
                                {DAY_OPTIONS.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Start time */}
                    <div>
                        <label className={labelClass}>Start Time</label>
                        <select
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className={inputClass}
                        >
                            <option value="">Select time</option>
                            {TIME_OPTIONS.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Session date */}
                    <div className="md:col-span-2">
                        <label className={labelClass}>{isSingleSession ? "Session Date" : "First Session Date"}</label>
                        <input
                            type="date"
                            value={firstSessionDate}
                            onChange={(e) => setFirstSessionDate(e.target.value)}
                            className={inputClass}
                        />
                        {firstSessionPreview && (
                            <p className="mt-2 text-sm text-zinc-400">{firstSessionPreview}</p>
                        )}
                        {isSingleSession && (
                            <label className="mt-3 flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isMakeup}
                                    onChange={(e) => setIsMakeup(e.target.checked)}
                                    className="rounded-none accent-[#cc0000]"
                                />
                                <span className="text-sm text-zinc-400">This is a makeup lesson</span>
                            </label>
                        )}
                    </div>
                </div>

                <div className="mt-5 flex items-center gap-4">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-none bg-[#cc0000] px-5 py-3 font-semibold text-white hover:bg-[#b30000] disabled:opacity-50"
                    >
                        {saving ? "Saving…" : "Create Enrollment"}
                    </button>
                    {saveMessage && (
                        <span className="text-sm text-zinc-300">{saveMessage}</span>
                    )}
                    {onNavigateToManage && (
                        <button
                            type="button"
                            onClick={onNavigateToManage}
                            className="rounded-none bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition"
                        >
                            Manage Lessons →
                        </button>
                    )}
                </div>
            </div>}

            {/* SECTION 2 — ACTIVE ENROLLMENTS (per student) */}
            {mode === "manage" && <div className="bg-[#111111] rounded-none p-5">
                <h2 className="sor-display text-3xl md:text-4xl leading-none">
                    <span style={{ color: "#cc0000" }}>ACTIVE</span>
                    <span className="ml-2 text-white italic normal-case">Enrollments</span>
                </h2>
                <div className="sor-divider" />

                {loadingEnrollments ? (
                    <div className="text-zinc-400 text-sm">Loading enrollments…</div>
                ) : studentRows.length === 0 ? (
                    <div className="text-zinc-400 text-sm">No active enrollments.</div>
                ) : (
                    <div className="grid gap-2 mt-4">
                        {studentRows.map((sr) => {
                            const firstEnrollment = sr.enrollments[0];
                            const instruments = [...new Set(sr.enrollments.map((e) => e.instrument))];
                            const instrumentLabel = instruments.length === 1
                                ? instruments[0]
                                : "Multiple Instruments";
                            const firstInstructorUser = users.find((u) => u.id === firstEnrollment?.instructor_id);
                            const firstInstructorName = firstInstructorUser?.name ?? firstEnrollment?.instructor_id ?? "—";
                            const isExpanded = expandedStudentId === sr.studentId;

                            return (
                                <div
                                    key={sr.studentId}
                                    className="bg-[#1a1a1a] rounded-none px-4 py-3"
                                >
                                    {/* Student summary row */}
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-white text-sm font-medium">{sr.studentName}</span>
                                                <span className="text-zinc-500 text-xs">·</span>
                                                <span className="text-zinc-400 text-xs capitalize">{instrumentLabel}</span>
                                                {sr.enrollments.length > 1 && (
                                                    <span className="rounded-none px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wide bg-zinc-700">
                                                        {sr.enrollments.length} Enrollments
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 text-zinc-500 text-xs">
                                                {firstInstructorName}
                                                {firstEnrollment?.day_of_week ? ` · ${firstEnrollment.day_of_week}` : ""}
                                                {firstEnrollment?.start_time ? ` · ${formatTime(firstEnrollment.start_time)}` : ""}
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => toggleExpand(sr.studentId, sr.enrollments)}
                                                className={`${smallBtnClass} bg-zinc-700 hover:bg-zinc-600`}
                                            >
                                                {isExpanded ? "Hide Sessions" : "Manage Sessions"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeactivateAll(sr.enrollments)}
                                                className={`${smallBtnClass} bg-zinc-800 hover:bg-zinc-700`}
                                            >
                                                Deactivate All
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded session management */}
                                    {isExpanded && renderSessionManagement(sr.studentId, sr.enrollments)}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>}
        </div>
    );
}
