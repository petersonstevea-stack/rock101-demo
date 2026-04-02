"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AppUser } from "@/types/user";
import {
    INSTRUMENT_OPTIONS,
    PROGRAM_OPTIONS,
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

const LESSON_PROGRAM_OPTIONS = PROGRAM_OPTIONS.filter(
    (p) => p.value === "rock101" || p.value === "performance_program"
);

type StudentRow = {
    id: string;
    first_name: string;
    last_initial: string | null;
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
    students: { first_name: string; last_initial: string | null } | null;
};

type SessionRow = {
    id: string;
    session_date: string;
    status: string;
    instructor_id: string | null;
    instructor_override_id: string | null;
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

type LessonSetupViewProps = {
    schoolId: string;
    users: AppUser[];
};

const inputClass = "w-full rounded-none border border-zinc-700 bg-black px-4 py-3 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none";
const labelClass = "mb-2 block text-sm text-zinc-400";
const smallBtnClass = "rounded-none px-2.5 py-1 text-xs font-medium text-white transition";

export default function LessonSetupView({ schoolId, users }: LessonSetupViewProps) {
    // Form state
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [instructorId, setInstructorId] = useState("");
    const [instrument, setInstrument] = useState("");
    const [program, setProgram] = useState("rock101");
    const [dayOfWeek, setDayOfWeek] = useState("Monday");
    const [startTime, setStartTime] = useState("");
    const [firstSessionDate, setFirstSessionDate] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");

    // Enrollments list
    const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState(true);

    // Session management state
    const [expandedEnrollmentId, setExpandedEnrollmentId] = useState<string | null>(null);
    const [enrollmentSessions, setEnrollmentSessions] = useState<Record<string, SessionRow[]>>({});
    const [loadingSessions, setLoadingSessions] = useState<string | null>(null);
    const [changingInstructor, setChangingInstructor] = useState<ChangeInstructorState | null>(null);
    const [selectedOverrideInstructorId, setSelectedOverrideInstructorId] = useState("");
    const [cancelling, setCancelling] = useState<CancelState | null>(null);

    useEffect(() => {
        if (!schoolId) return;
        loadStudents();
        loadEnrollments();
    }, [schoolId]);

    async function loadStudents() {
        const { data } = await supabase
            .from("students")
            .select("id, first_name, last_initial")
            .eq("school_id", schoolId)
            .eq("active", true)
            .order("first_name");
        setStudents((data ?? []) as StudentRow[]);
    }

    async function loadEnrollments() {
        setLoadingEnrollments(true);
        const { data } = await supabase
            .from("private_lesson_enrollments")
            .select("id, student_id, instructor_id, instrument, program, day_of_week, start_time, active, students(first_name, last_initial)")
            .eq("school_id", schoolId)
            .eq("active", true)
            .order("day_of_week");
        setEnrollments((data ?? []) as unknown as EnrollmentRow[]);
        setLoadingEnrollments(false);
    }

    async function loadSessionsForEnrollment(enrollmentId: string) {
        setLoadingSessions(enrollmentId);
        const today = new Date().toISOString().slice(0, 10);
        const { data } = await supabase
            .from("private_lesson_sessions")
            .select("id, session_date, status, instructor_id, instructor_override_id")
            .eq("enrollment_id", enrollmentId)
            .eq("status", "scheduled")
            .gte("session_date", today)
            .order("session_date")
            .limit(12);
        setEnrollmentSessions((prev) => ({ ...prev, [enrollmentId]: (data ?? []) as SessionRow[] }));
        setLoadingSessions(null);
    }

    function toggleExpand(enrollmentId: string) {
        if (expandedEnrollmentId === enrollmentId) {
            setExpandedEnrollmentId(null);
            setChangingInstructor(null);
            setCancelling(null);
        } else {
            setExpandedEnrollmentId(enrollmentId);
            setChangingInstructor(null);
            setCancelling(null);
            if (!enrollmentSessions[enrollmentId]) {
                loadSessionsForEnrollment(enrollmentId);
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
        await loadSessionsForEnrollment(enrollmentId);
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
        await loadSessionsForEnrollment(enrollmentId);
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
        return `${dayName}s${timePart} — generating 104 sessions from ${formatted}`;
    }, [firstSessionDate, startTime]);

    function resetForm() {
        setSelectedStudentId("");
        setStudentSearch("");
        setInstructorId("");
        setInstrument("");
        setProgram("rock101");
        setDayOfWeek("Monday");
        setStartTime("");
        setFirstSessionDate("");
        setSaveMessage("");
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

        const { error: enrollError } = await supabase
            .from("private_lesson_enrollments")
            .insert({
                id: enrollmentId,
                school_id: schoolId,
                student_id: selectedStudentId,
                instructor_id: instructorId,
                instrument,
                program,
                day_of_week: derivedDay,
                start_time: startTime,
                first_session_date: firstSessionDate,
                active: true,
            });

        if (enrollError) {
            alert(`Error saving enrollment: ${enrollError.message}`);
            setSaving(false);
            return;
        }

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

    function resolveInstructorName(session: SessionRow, enrollmentInstructorId: string | null): string {
        const overrideId = session.instructor_override_id;
        const effectiveId = overrideId ?? enrollmentInstructorId;
        if (!effectiveId) return "—";
        const user = users.find((u) => u.id === effectiveId);
        const name = user?.name ?? effectiveId;
        return overrideId ? `${name} (override)` : name;
    }

    function renderSessionManagement(enrollment: EnrollmentRow) {
        const sessions = enrollmentSessions[enrollment.id] ?? [];
        const isLoading = loadingSessions === enrollment.id;

        return (
            <div className="mt-3 border-t border-zinc-800 pt-3">
                {isLoading ? (
                    <div className="text-zinc-500 text-xs">Loading sessions…</div>
                ) : sessions.length === 0 ? (
                    <div className="text-zinc-500 text-xs">No upcoming scheduled sessions.</div>
                ) : (
                    <div className="grid gap-2">
                        {sessions.map((session) => {
                            const instructorName = resolveInstructorName(session, enrollment.instructor_id);
                            const isChanging = changingInstructor?.sessionId === session.id;
                            const isCancelling = cancelling?.sessionId === session.id;

                            return (
                                <div key={session.id} className="bg-[#111111] rounded-none px-3 py-2.5">
                                    {/* Session header row */}
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-white text-xs font-medium">
                                                {formatSessionDate(session.session_date)}
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
                                        </div>
                                        {!isChanging && !isCancelling && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCancelling(null);
                                                        setChangingInstructor({
                                                            sessionId: session.id,
                                                            sessionDate: session.session_date,
                                                            enrollmentId: enrollment.id,
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
                                                        setCancelling({
                                                            sessionId: session.id,
                                                            sessionDate: session.session_date,
                                                            enrollmentId: enrollment.id,
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
            <div className="bg-[#111111] rounded-none p-5">
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

                    {/* Program */}
                    <div>
                        <label className={labelClass}>Program</label>
                        <select
                            value={program}
                            onChange={(e) => setProgram(e.target.value)}
                            className={inputClass}
                        >
                            {LESSON_PROGRAM_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Day of week */}
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

                    {/* First session date */}
                    <div className="md:col-span-2">
                        <label className={labelClass}>First Session Date</label>
                        <input
                            type="date"
                            value={firstSessionDate}
                            onChange={(e) => setFirstSessionDate(e.target.value)}
                            className={inputClass}
                        />
                        {firstSessionPreview && (
                            <p className="mt-2 text-sm text-zinc-400">{firstSessionPreview}</p>
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
                </div>
            </div>

            {/* SECTION 2 — ACTIVE ENROLLMENTS */}
            <div className="bg-[#111111] rounded-none p-5">
                <h2 className="sor-display text-3xl md:text-4xl leading-none">
                    <span style={{ color: "#cc0000" }}>ACTIVE</span>
                    <span className="ml-2 text-white italic normal-case">Enrollments</span>
                </h2>
                <div className="sor-divider" />

                {loadingEnrollments ? (
                    <div className="text-zinc-400 text-sm">Loading enrollments…</div>
                ) : enrollments.length === 0 ? (
                    <div className="text-zinc-400 text-sm">No active enrollments.</div>
                ) : (
                    <div className="grid gap-2 mt-4">
                        {enrollments.map((enrollment) => {
                            const instructorUser = users.find((u) => u.id === enrollment.instructor_id);
                            const instructorName = instructorUser?.name ?? enrollment.instructor_id ?? "—";
                            const studentName = enrollment.students
                                ? `${enrollment.students.first_name} ${enrollment.students.last_initial ?? ""}`.trim()
                                : enrollment.student_id;
                            const isRock101 = enrollment.program === "rock101";
                            const isExpanded = expandedEnrollmentId === enrollment.id;

                            return (
                                <div
                                    key={enrollment.id}
                                    className="bg-[#1a1a1a] rounded-none px-4 py-3"
                                >
                                    {/* Enrollment summary row */}
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-white text-sm font-medium">{studentName}</span>
                                                <span className="text-zinc-500 text-xs">·</span>
                                                <span className="text-zinc-400 text-xs capitalize">{enrollment.instrument}</span>
                                                <span
                                                    className="rounded-none px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wide"
                                                    style={{
                                                        backgroundColor: isRock101 ? "#cc0000" : "#1a1a1a",
                                                        border: isRock101 ? "none" : "1px solid #fff",
                                                    }}
                                                >
                                                    {isRock101 ? "Rock 101" : "Performance"}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-zinc-500 text-xs">
                                                {instructorName} · {enrollment.day_of_week}{enrollment.start_time ? ` · ${formatTime(enrollment.start_time)}` : ""}
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => toggleExpand(enrollment.id)}
                                                className={`${smallBtnClass} bg-zinc-700 hover:bg-zinc-600`}
                                            >
                                                {isExpanded ? "Hide Sessions" : "Manage Sessions"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeactivate(enrollment.id)}
                                                className={`${smallBtnClass} bg-zinc-800 hover:bg-zinc-700`}
                                            >
                                                Deactivate
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded session management */}
                                    {isExpanded && renderSessionManagement(enrollment)}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
