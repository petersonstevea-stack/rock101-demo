"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SessionRow = {
    id: string;
    session_date: string;
    class_instructor_notes: string | null;
    rock_classes: {
        id: string;
        name: string;
        class_instructor_email: string | null;
        student_ids: string[] | null;
    } | null;
};

type StudentRow = {
    id: string;
    first_name: string;
    last_initial: string | null;
    primary_instructor_email: string | null;
    workflow: {
        instructorSubmitted?: boolean;
        classInstructorSubmitted?: boolean;
        parentSubmitted?: boolean;
    } | null;
};

type StaffRow = {
    email: string;
    name: string;
};

type ExecutionDashboardProps = {
    schoolId: string;
    currentUserEmail: string;
};

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getWeekBounds(): { start: string; end: string } {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - day);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return {
        start: startOfWeek.toISOString().slice(0, 10),
        end: endOfWeek.toISOString().slice(0, 10),
    };
}

function getFirstName(email: string | null | undefined, staffMap: Record<string, string>): string | null {
    if (!email) return null;
    const fullName = staffMap[email];
    if (!fullName) return null;
    return fullName.split(" ")[0];
}

function getStatusSummary(
    workflow: StudentRow["workflow"],
    staffMap: Record<string, string>,
    primaryInstructorEmail: string | null | undefined,
    classInstructorMap: Record<string, string>,
    studentId: string,
    groupAbsentIds: Set<string>,
    lessonAbsentIds: Set<string>,
): string[] {
    const w = workflow ?? {};
    const classEmail = classInstructorMap[studentId];
    const classFirstName = getFirstName(classEmail, staffMap);
    const skipClass = groupAbsentIds.has(studentId);
    const skipLesson = lessonAbsentIds.has(studentId);
    if (w.parentSubmitted) return ["Sent"];
    if (w.instructorSubmitted && w.classInstructorSubmitted) return ["Ready to send"];
    if (!w.instructorSubmitted && !w.classInstructorSubmitted) {
        const firstName = getFirstName(primaryInstructorEmail, staffMap);
        const lines: string[] = [];
        if (!skipLesson) lines.push(firstName ? `Waiting on Instructor (${firstName})` : "Waiting on Instructor");
        if (!skipClass) lines.push(classFirstName ? `Waiting on Class Instructor (${classFirstName})` : "Waiting on Class Instructor");
        return lines;
    }
    if (!w.instructorSubmitted) {
        const firstName = getFirstName(primaryInstructorEmail, staffMap);
        if (skipLesson) return [];
        return [firstName ? `Waiting on Instructor (${firstName})` : "Waiting on Instructor"];
    }
    if (skipClass) return [];
    return [classFirstName ? `Waiting on Class Instructor (${classFirstName})` : "Waiting on Class Instructor"];
}

function Check() {
    return <span className="text-emerald-400 font-bold">✓</span>;
}

function Warn() {
    return <span style={{ color: "#cc0000" }} className="font-bold">⚠</span>;
}

function Dash() {
    return <span className="text-zinc-500">—</span>;
}

export default function ExecutionDashboard({ schoolId, currentUserEmail: _currentUserEmail }: ExecutionDashboardProps) {
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [staffMap, setStaffMap] = useState<Record<string, string>>({});
    const [classInstructorMap, setClassInstructorMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCompleted, setShowCompleted] = useState(false);
    const [groupAbsentIds, setGroupAbsentIds] = useState<Set<string>>(new Set());
    const [lessonAbsentIds, setLessonAbsentIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!schoolId) return;

        async function load() {
            setLoading(true);
            setError(null);

            const { start, end } = getWeekBounds();

            const [sessionsResult, studentsResult, staffResult, lessonAbsenceResult] = await Promise.all([
                supabase
                    .from("class_sessions")
                    .select("id, session_date, class_instructor_notes, rock_classes(id, name, class_instructor_email, student_ids)")
                    .eq("rock_classes.school_id", schoolId)
                    .gte("session_date", start)
                    .lte("session_date", end),
                supabase
                    .from("students")
                    .select("id, first_name, last_initial, primary_instructor_email, workflow")
                    .eq("school_id", schoolId)
                    .eq("active", true),
                supabase
                    .from("staff")
                    .select("email, name"),
                supabase
                    .from("private_lesson_sessions")
                    .select("student_id")
                    .gte("session_date", start)
                    .lte("session_date", end)
                    .eq("absent", true),
            ]);

            const weekSessionIds = (sessionsResult.data ?? []).map((s: any) => s.id);
            const signoffsResult = await supabase
                .from("session_student_signoffs")
                .select("student_id, group_class_absent")
                .eq("group_class_absent", true)
                .in("session_id", weekSessionIds);

            if (sessionsResult.error) {
                setError(sessionsResult.error.message);
                setLoading(false);
                return;
            }
            if (studentsResult.error) {
                setError(studentsResult.error.message);
                setLoading(false);
                return;
            }

            const map: Record<string, string> = {};
            for (const s of (staffResult.data ?? []) as StaffRow[]) {
                if (s.email) map[s.email] = s.name;
            }

            const ciMap: Record<string, string> = {};
            for (const session of (sessionsResult.data ?? []) as unknown as SessionRow[]) {
                const rc = session.rock_classes;
                if (!rc?.class_instructor_email || !rc.student_ids) continue;
                for (const studentId of rc.student_ids) {
                    ciMap[studentId] = rc.class_instructor_email;
                }
            }

            const groupAbsent = new Set<string>(
                ((signoffsResult.data ?? []) as any[])
                    .map((r) => r.student_id as string)
                    .filter(Boolean)
            );
            const lessonAbsent = new Set<string>(
                ((lessonAbsenceResult.data ?? []) as any[])
                    .map((r) => r.student_id as string)
                    .filter(Boolean)
            );

            setSessions((sessionsResult.data ?? []) as unknown as SessionRow[]);
            setStudents((studentsResult.data ?? []) as unknown as StudentRow[]);
            setStaffMap(map);
            setClassInstructorMap(ciMap);
            setGroupAbsentIds(new Set(groupAbsent));
            setLessonAbsentIds(new Set(lessonAbsent));
            setLoading(false);
        }

        load();
    }, [schoolId]);

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-zinc-400 text-sm">Loading execution data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="text-sm" style={{ color: "#cc0000" }}>Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 overflow-x-hidden">

            {/* SECTION 1 — THIS WEEK'S SESSIONS */}
            <div className="bg-[#111111] rounded-none p-5">
                <h2 className="sor-display text-3xl md:text-4xl leading-none">
                    <span style={{ color: "#cc0000" }}>THIS WEEK'S</span>
                    <span className="ml-2 text-white italic normal-case">Sessions</span>
                </h2>
                <div className="sor-divider" />

                {sessions.length === 0 ? (
                    <div className="text-zinc-400 text-sm">No sessions scheduled this week.</div>
                ) : (
                    <div className="grid gap-2 mt-4">
                        {sessions.map((session) => {
                            const rc = session.rock_classes;
                            const instructorEmail = rc?.class_instructor_email ?? null;
                            const instructorName = instructorEmail
                                ? (staffMap[instructorEmail] ?? instructorEmail)
                                : "—";
                            const studentCount = rc?.student_ids?.length ?? 0;
                            const hasNotes = !!session.class_instructor_notes?.trim();

                            return (
                                <div
                                    key={session.id}
                                    className="bg-[#1a1a1a] rounded-none px-4 py-3"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="text-white font-semibold text-sm">
                                                {rc?.name ?? "Unnamed Class"}
                                            </div>
                                            <div className="text-zinc-400 text-xs mt-0.5">
                                                {formatDate(session.session_date)} &bull; {instructorName} &bull; {studentCount} student{studentCount !== 1 ? "s" : ""}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-sm">
                                            {hasNotes ? (
                                                <span className="text-emerald-400 text-xs font-medium">✓ Notes saved</span>
                                            ) : (
                                                <span className="text-xs font-medium" style={{ color: "#cc0000" }}>⚠ No notes</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* SECTION 2 — STUDENT WEEKLY STATUS */}
            <div className="bg-[#111111] rounded-none p-5">
                <h2 className="sor-display text-3xl md:text-4xl leading-none">
                    <span style={{ color: "#cc0000" }}>STUDENT</span>
                    <span className="ml-2 text-white italic normal-case">Weekly Status</span>
                </h2>
                <div className="sor-divider" />

                {students.length === 0 ? (
                    <div className="text-zinc-400 text-sm">No active students found for this school.</div>
                ) : (() => {
                    const completedCount = students.filter((s) => s.workflow?.parentSubmitted).length;
                    const visibleStudents = showCompleted
                        ? students
                        : students.filter((s) => {
                            if (s.workflow?.parentSubmitted) return false;
                            const lines = getStatusSummary(s.workflow, staffMap, s.primary_instructor_email, classInstructorMap, s.id, groupAbsentIds, lessonAbsentIds);
                            return lines.length > 0;
                        });
                    const mid = Math.ceil(visibleStudents.length / 2);
                    const columns = [visibleStudents.slice(0, mid), visibleStudents.slice(mid)];

                    return (
                        <>
                            {completedCount > 0 && (
                                <div className="mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCompleted((v) => !v)}
                                        className="rounded-none bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition"
                                    >
                                        {showCompleted ? "Hide completed" : `Show completed (${completedCount})`}
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {columns.map((col, colIdx) => (
                                    <div key={colIdx} className="grid gap-2">
                                        {/* Header row */}
                                        <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2">
                                            <div className="text-zinc-500 text-xs uppercase tracking-wider">Student</div>
                                            <div className="hidden md:block text-zinc-500 text-xs uppercase tracking-wider text-center w-20">Instructor</div>
                                            <div className="hidden md:block text-zinc-500 text-xs uppercase tracking-wider text-center w-14">Class</div>
                                            <div className="hidden md:block text-zinc-500 text-xs uppercase tracking-wider text-center w-14">Parent</div>
                                            <div className="text-zinc-500 text-xs uppercase tracking-wider text-right w-36">Status</div>
                                        </div>

                                        {col.map((student) => {
                                            const w = student.workflow ?? {};
                                            const statusLines = getStatusSummary(w, staffMap, student.primary_instructor_email, classInstructorMap, student.id, groupAbsentIds, lessonAbsentIds);
                                            const isReadyToSend = statusLines[0] === "Ready to send";
                                            const isComplete = !!w.parentSubmitted;

                                            return (
                                                <div
                                                    key={student.id}
                                                    className={`bg-[#1a1a1a] rounded-none px-4 py-3 ${isComplete ? "opacity-50" : ""}`}
                                                    style={isReadyToSend ? { borderLeft: "3px solid #cc0000" } : undefined}
                                                >
                                                    <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3">
                                                        <div>
                                                            <div className="text-white text-sm font-medium">{`${student.first_name} ${student.last_initial ?? ""}`.trim()}</div>
                                                            <div className="text-zinc-500 text-xs mt-0.5">
                                                                {staffMap[student.primary_instructor_email ?? ""] ?? student.primary_instructor_email ?? "Unassigned"}
                                                            </div>
                                                        </div>
                                                        <div className="hidden md:block text-center w-20 text-sm">
                                                            {w.instructorSubmitted ? <Check /> : <Warn />}
                                                        </div>
                                                        <div className="hidden md:block text-center w-14 text-sm">
                                                            {w.classInstructorSubmitted ? <Check /> : <Warn />}
                                                        </div>
                                                        <div className="hidden md:block text-center w-14 text-sm">
                                                            {w.parentSubmitted ? <Check /> : <Dash />}
                                                        </div>
                                                        <div className="text-right w-36">
                                                            {statusLines.map((line, i) => (
                                                                <div key={i} className="text-xs font-medium" style={{
                                                                    color: line === "Sent" ? "#86efac"
                                                                        : line === "Ready to send" ? "#cc0000"
                                                                        : "#71717a",
                                                                }}>
                                                                    {line}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </>
                    );
                })()}
            </div>
        </div>
    );
}
