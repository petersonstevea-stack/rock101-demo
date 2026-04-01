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

function getStatusSummary(workflow: StudentRow["workflow"]): string {
    const w = workflow ?? {};
    if (w.parentSubmitted) return "Sent";
    if (w.instructorSubmitted && w.classInstructorSubmitted) return "Ready to send";
    if (!w.instructorSubmitted) return "Waiting on instructor";
    return "Waiting on class instructor";
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!schoolId) return;

        async function load() {
            setLoading(true);
            setError(null);

            const { start, end } = getWeekBounds();

            const [sessionsResult, studentsResult, staffResult] = await Promise.all([
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
                    .select("email, name")
                    .eq("school_id", schoolId),
            ]);

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
                if (s.email) map[s.email.toLowerCase()] = s.name;
            }

            setSessions((sessionsResult.data ?? []) as unknown as SessionRow[]);
            setStudents((studentsResult.data ?? []) as unknown as StudentRow[]);
            setStaffMap(map);
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
        <div className="p-6 space-y-6">

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
                                ? (staffMap[instructorEmail.toLowerCase()] ?? instructorEmail)
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
                ) : (
                    <div className="grid gap-2 mt-4">
                        {/* Header row */}
                        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2">
                            <div className="text-zinc-500 text-xs uppercase tracking-wider">Student</div>
                            <div className="text-zinc-500 text-xs uppercase tracking-wider text-center w-20">Instructor</div>
                            <div className="text-zinc-500 text-xs uppercase tracking-wider text-center w-14">Class</div>
                            <div className="text-zinc-500 text-xs uppercase tracking-wider text-center w-14">Parent</div>
                            <div className="text-zinc-500 text-xs uppercase tracking-wider text-right w-36">Status</div>
                        </div>

                        {students.map((student) => {
                            const w = student.workflow ?? {};
                            const instructorEmail = student.primary_instructor_email ?? null;
                            const instructorName = instructorEmail
                                ? (staffMap[instructorEmail.toLowerCase()] ?? instructorEmail)
                                : "—";
                            const status = getStatusSummary(w);
                            const isReadyToSend = status === "Ready to send";

                            return (
                                <div
                                    key={student.id}
                                    className="bg-[#1a1a1a] rounded-none px-4 py-3"
                                    style={isReadyToSend ? { borderLeft: "3px solid #cc0000" } : undefined}
                                >
                                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3">
                                        <div>
                                            <div className="text-white text-sm font-medium">{`${student.first_name} ${student.last_initial ?? ""}`.trim()}</div>
                                            <div className="text-zinc-500 text-xs mt-0.5">{instructorName}</div>
                                        </div>
                                        <div className="text-center w-20 text-sm">
                                            {w.instructorSubmitted ? <Check /> : <Warn />}
                                        </div>
                                        <div className="text-center w-14 text-sm">
                                            {w.classInstructorSubmitted ? <Check /> : <Warn />}
                                        </div>
                                        <div className="text-center w-14 text-sm">
                                            {w.parentSubmitted ? <Check /> : <Dash />}
                                        </div>
                                        <div className="text-right w-36">
                                            <span
                                                className="text-xs font-medium"
                                                style={{
                                                    color: status === "Sent" ? "#86efac"
                                                        : status === "Ready to send" ? "#cc0000"
                                                        : "#71717a",
                                                }}
                                            >
                                                {status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
