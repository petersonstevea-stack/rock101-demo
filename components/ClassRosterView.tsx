"use client";

import { useState, useEffect, useCallback } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ClassRow = {
    id: string;
    name: string;
    day_of_week: string | null;
    time: string | null;
    class_instructor_id: string | null;
    student_ids: string[];
};

type StudentRow = {
    id: string;
    first_name: string;
    last_initial: string | null;
    school_id: string;
};

type SessionRow = {
    id: string;
    session_date: string;
    status: string;
    instructor_override_user_id: string | null;
};

type ClassRosterViewProps = {
    schoolId: string;
    currentUserStaffId: string;
    currentUserRole: string;
    users: { id: string; name: string; email: string; role: string }[];
};

function formatSessionDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function ClassRosterView({
    schoolId,
    currentUserStaffId,
    currentUserRole,
    users,
}: ClassRosterViewProps) {
    const [classes, setClasses] = useState<ClassRow[]>([]);
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Record<string, "roster" | "sessions">>({});
    const [rosterStudents, setRosterStudents] = useState<Record<string, StudentRow[]>>({});
    const [sessions, setSessions] = useState<Record<string, SessionRow[]>>({});
    const [showAllSessions, setShowAllSessions] = useState<Record<string, boolean>>({});
    const [showPastSessions, setShowPastSessions] = useState<Record<string, boolean>>({});
    const [addStudentMode, setAddStudentMode] = useState<Record<string, boolean>>({});
    const [allSchoolStudents, setAllSchoolStudents] = useState<StudentRow[]>([]);
    const [allowMakeup, setAllowMakeup] = useState<Record<string, boolean>>({});
    const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);

    const isInstructor = currentUserRole === "instructor";

    const loadClasses = useCallback(async () => {
        let query = supabase
            .from("rock_classes")
            .select("id, name, day_of_week, time, class_instructor_id, student_ids")
            .eq("school_id", schoolId)
            .order("name");

        if (isInstructor) {
            query = (query as any).eq("class_instructor_id", currentUserStaffId);
        }

        const { data } = await query;
        setClasses(
            (data ?? []).map((c: any) => ({
                ...c,
                student_ids: c.student_ids ?? [],
            }))
        );
    }, [schoolId, isInstructor, currentUserStaffId]);

    useEffect(() => {
        loadClasses();
    }, [loadClasses]);

    async function loadRoster(classId: string, studentIds: string[]) {
        if (studentIds.length === 0) {
            setRosterStudents((prev) => ({ ...prev, [classId]: [] }));
            return;
        }
        const { data } = await supabase
            .from("students")
            .select("id, first_name, last_initial, school_id")
            .in("id", studentIds);
        setRosterStudents((prev) => ({ ...prev, [classId]: data ?? [] }));
    }

    async function loadSessions(classId: string, includePast: boolean, showAll: boolean) {
        const today = new Date().toISOString().split("T")[0];
        const eightWeeksOut = new Date();
        eightWeeksOut.setDate(eightWeeksOut.getDate() + 56);
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        let query = supabase
            .from("class_sessions")
            .select("id, session_date, status, instructor_override_user_id")
            .eq("class_id", classId);

        const lowerBound = includePast
            ? eightWeeksAgo.toISOString().split("T")[0]
            : today;

        query = query.gte("session_date", lowerBound);

        if (!showAll) {
            query = query.lte("session_date", eightWeeksOut.toISOString().split("T")[0]);
        }

        query = query.order("session_date", { ascending: true });

        const { data } = await query;
        setSessions((prev) => ({ ...prev, [classId]: data ?? [] }));
    }

    async function loadAllSchoolStudents() {
        if (allSchoolStudents.length > 0) return;
        const { data } = await supabase
            .from("students")
            .select("id, first_name, last_initial, school_id")
            .eq("school_id", schoolId)
            .order("first_name");
        setAllSchoolStudents(data ?? []);
    }

    function resolveInstructorName(
        instructorOverrideId: string | null,
        fallbackInstructorId: string | null
    ): string {
        const id = instructorOverrideId ?? fallbackInstructorId;
        if (!id) return "Not assigned";
        return users.find((u) => u.id === id)?.name ?? "Unknown";
    }

    function getStudentCurrentClass(studentId: string): string | null {
        const cls = classes.find(
            (c) => c.id !== expandedClassId && c.student_ids.includes(studentId)
        );
        return cls?.name ?? null;
    }

    async function handleRemoveStudent(cls: ClassRow, studentId: string) {
        const nextIds = cls.student_ids.filter((id) => id !== studentId);
        await supabase
            .from("rock_classes")
            .update({ student_ids: nextIds })
            .eq("id", cls.id);
        await loadClasses();
        await loadRoster(cls.id, nextIds);
    }

    async function handleAddStudent(cls: ClassRow, studentId: string) {
        const nextIds = [...cls.student_ids, studentId];
        await supabase
            .from("rock_classes")
            .update({ student_ids: nextIds })
            .eq("id", cls.id);
        setAddStudentMode((prev) => ({ ...prev, [cls.id]: false }));
        await loadClasses();
        await loadRoster(cls.id, nextIds);
    }

    async function handleCancelSession(sessionId: string, classId: string) {
        await supabase
            .from("class_sessions")
            .update({ status: "cancelled" })
            .eq("id", sessionId);
        setCancelConfirm(null);
        await loadSessions(classId, !!showPastSessions[classId], !!showAllSessions[classId]);
    }

    async function handleToggleExpand(cls: ClassRow) {
        if (expandedClassId === cls.id) {
            setExpandedClassId(null);
            return;
        }
        setExpandedClassId(cls.id);
        const tab = activeTab[cls.id] ?? "roster";
        if (!activeTab[cls.id]) {
            setActiveTab((prev) => ({ ...prev, [cls.id]: "roster" }));
        }
        if (tab === "roster") {
            await loadRoster(cls.id, cls.student_ids);
        } else {
            await loadSessions(cls.id, false, false);
        }
    }

    async function handleTabChange(cls: ClassRow, tab: "roster" | "sessions") {
        setActiveTab((prev) => ({ ...prev, [cls.id]: tab }));
        if (tab === "roster") {
            await loadRoster(cls.id, cls.student_ids);
        } else {
            await loadSessions(cls.id, !!showPastSessions[cls.id], !!showAllSessions[cls.id]);
        }
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="px-6 pt-6 pb-6 space-y-4">
                {/* Page header */}
                <div className="bg-[#111111] rounded-none p-5">
                    <div className="flex items-center gap-3">
                        <Users size={28} color="#cc0000" />
                        <h1 className="sor-display text-4xl leading-none md:text-5xl">
                            <span style={{ color: "#cc0000" }}>Class</span>
                            <span className="ml-2 text-white italic">Roster</span>
                        </h1>
                    </div>
                    <div className="sor-divider" />
                    <p className="mt-3 text-zinc-400 text-sm">
                        {isInstructor
                            ? "Manage rosters and sessions for your assigned classes"
                            : "Manage rosters and sessions for all classes at this school"}
                    </p>
                </div>

                {/* Class list */}
                {classes.length === 0 ? (
                    <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6 text-zinc-300">
                        No classes found.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {classes.map((cls) => {
                            const instructorName = resolveInstructorName(null, cls.class_instructor_id);
                            const isExpanded = expandedClassId === cls.id;
                            const tab = activeTab[cls.id] ?? "roster";

                            return (
                                <div key={cls.id} className="bg-[#1a1a1a] rounded-none">
                                    {/* Class header row */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleExpand(cls)}
                                        className="w-full px-5 py-4 text-left flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-bold text-white text-base">{cls.name}</div>
                                            <div className="mt-1 text-sm text-zinc-400">
                                                {[cls.day_of_week, cls.time].filter(Boolean).join(" · ")}
                                                {instructorName !== "Not assigned" && (
                                                    <span className="ml-2">· {instructorName}</span>
                                                )}
                                                <span className="ml-2">
                                                    · {cls.student_ids.length} student
                                                    {cls.student_ids.length !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-zinc-500 text-sm ml-4 shrink-0">
                                            {isExpanded ? "▲" : "▼"}
                                        </span>
                                    </button>

                                    {/* Expanded content */}
                                    {isExpanded && (
                                        <div className="border-t border-zinc-800">
                                            {/* Tab buttons */}
                                            <div className="flex border-b border-zinc-800">
                                                {(["roster", "sessions"] as const).map((t) => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => handleTabChange(cls, t)}
                                                        className="px-5 py-3 text-sm font-semibold uppercase tracking-wide rounded-none"
                                                        style={{
                                                            backgroundColor: tab === t ? "#cc0000" : "transparent",
                                                            color: "#ffffff",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (tab !== t) {
                                                                e.currentTarget.style.backgroundColor = "#1a1a1a";
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (tab !== t) {
                                                                e.currentTarget.style.backgroundColor = "transparent";
                                                            }
                                                        }}
                                                    >
                                                        {t === "roster" ? "Roster" : "Sessions"}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* ROSTER TAB */}
                                            {tab === "roster" && (
                                                <div className="p-5 space-y-3">
                                                    {(rosterStudents[cls.id] ?? []).length === 0 &&
                                                    !addStudentMode[cls.id] ? (
                                                        <div className="text-zinc-500 text-sm">
                                                            No students enrolled.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {(rosterStudents[cls.id] ?? []).map((student) => (
                                                                <div
                                                                    key={student.id}
                                                                    className="flex items-center justify-between bg-zinc-900 px-4 py-2.5"
                                                                >
                                                                    <span className="text-white text-sm">
                                                                        {student.first_name}{" "}
                                                                        {student.last_initial ?? ""}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleRemoveStudent(cls, student.id)
                                                                        }
                                                                        className="rounded-none border border-zinc-600 px-3 py-1 text-xs text-white hover:border-white"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Add Student */}
                                                    {!addStudentMode[cls.id] ? (
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                await loadAllSchoolStudents();
                                                                setAddStudentMode((prev) => ({
                                                                    ...prev,
                                                                    [cls.id]: true,
                                                                }));
                                                            }}
                                                            className="rounded-none bg-[#cc0000] px-4 py-2 text-sm text-white hover:bg-[#b30000]"
                                                        >
                                                            + Add Student
                                                        </button>
                                                    ) : (
                                                        <div className="space-y-3 border border-zinc-800 p-4">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-semibold text-white uppercase tracking-wide">
                                                                    Add Student
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setAddStudentMode((prev) => ({
                                                                            ...prev,
                                                                            [cls.id]: false,
                                                                        }))
                                                                    }
                                                                    className="text-zinc-400 text-xs hover:text-white"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>

                                                            {/* Makeup toggle */}
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!allowMakeup[cls.id]}
                                                                    onChange={(e) =>
                                                                        setAllowMakeup((prev) => ({
                                                                            ...prev,
                                                                            [cls.id]: e.target.checked,
                                                                        }))
                                                                    }
                                                                    className="accent-[#cc0000]"
                                                                />
                                                                <span className="text-sm text-zinc-300">
                                                                    Allow makeup / multi-class enrollment
                                                                </span>
                                                            </label>

                                                            {/* Student picker */}
                                                            <div className="space-y-1 max-h-64 overflow-y-auto">
                                                                {allSchoolStudents
                                                                    .filter(
                                                                        (s) =>
                                                                            allowMakeup[cls.id] ||
                                                                            !cls.student_ids.includes(s.id)
                                                                    )
                                                                    .map((s) => {
                                                                        const currentClass =
                                                                            getStudentCurrentClass(s.id);
                                                                        return (
                                                                            <button
                                                                                key={s.id}
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleAddStudent(cls, s.id)
                                                                                }
                                                                                className="w-full flex items-center justify-between bg-zinc-900 px-4 py-2.5 text-left hover:bg-zinc-800"
                                                                            >
                                                                                <span className="text-white text-sm">
                                                                                    {s.first_name}{" "}
                                                                                    {s.last_initial ?? ""}
                                                                                </span>
                                                                                {currentClass && (
                                                                                    <span className="text-xs text-zinc-500">
                                                                                        {currentClass}
                                                                                    </span>
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                {allSchoolStudents.filter(
                                                                    (s) =>
                                                                        allowMakeup[cls.id] ||
                                                                        !cls.student_ids.includes(s.id)
                                                                ).length === 0 && (
                                                                    <div className="text-zinc-500 text-sm px-4 py-2">
                                                                        All school students are already enrolled.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* SESSIONS TAB */}
                                            {tab === "sessions" && (
                                                <div className="p-5 space-y-3">
                                                    {/* Toggle controls */}
                                                    <div className="flex flex-wrap gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!showAllSessions[cls.id]}
                                                                onChange={async (e) => {
                                                                    const val = e.target.checked;
                                                                    setShowAllSessions((prev) => ({
                                                                        ...prev,
                                                                        [cls.id]: val,
                                                                    }));
                                                                    await loadSessions(
                                                                        cls.id,
                                                                        !!showPastSessions[cls.id],
                                                                        val
                                                                    );
                                                                }}
                                                                className="accent-[#cc0000]"
                                                            />
                                                            <span className="text-sm text-zinc-300">
                                                                Show all upcoming
                                                            </span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!showPastSessions[cls.id]}
                                                                onChange={async (e) => {
                                                                    const val = e.target.checked;
                                                                    setShowPastSessions((prev) => ({
                                                                        ...prev,
                                                                        [cls.id]: val,
                                                                    }));
                                                                    await loadSessions(
                                                                        cls.id,
                                                                        val,
                                                                        !!showAllSessions[cls.id]
                                                                    );
                                                                }}
                                                                className="accent-[#cc0000]"
                                                            />
                                                            <span className="text-sm text-zinc-300">
                                                                Show past sessions
                                                            </span>
                                                        </label>
                                                    </div>

                                                    {/* Session list */}
                                                    {(sessions[cls.id] ?? []).length === 0 ? (
                                                        <div className="text-zinc-500 text-sm">
                                                            No sessions found.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {(sessions[cls.id] ?? []).map((session) => {
                                                                const instrName = resolveInstructorName(
                                                                    session.instructor_override_user_id,
                                                                    cls.class_instructor_id
                                                                );
                                                                const isConfirming =
                                                                    cancelConfirm === session.id;

                                                                return (
                                                                    <div
                                                                        key={session.id}
                                                                        className="bg-zinc-900 px-4 py-3 flex items-center justify-between gap-4 flex-wrap"
                                                                    >
                                                                        <div className="flex items-center gap-3 flex-wrap">
                                                                            <span className="text-white text-sm font-medium">
                                                                                {formatSessionDate(
                                                                                    session.session_date
                                                                                )}
                                                                            </span>
                                                                            <span
                                                                                className="rounded-none px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                                                                                style={
                                                                                    session.status === "cancelled"
                                                                                        ? {
                                                                                              backgroundColor:
                                                                                                  "#450a0a",
                                                                                              color: "#fca5a5",
                                                                                          }
                                                                                        : {
                                                                                              backgroundColor:
                                                                                                  "#14532d",
                                                                                              color: "#86efac",
                                                                                          }
                                                                                }
                                                                            >
                                                                                {session.status}
                                                                            </span>
                                                                            <span className="text-zinc-400 text-xs">
                                                                                {instrName}
                                                                            </span>
                                                                        </div>

                                                                        {session.status === "scheduled" && (
                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                {isConfirming ? (
                                                                                    <>
                                                                                        <span className="text-xs text-zinc-300">
                                                                                            Cancel this session?
                                                                                        </span>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                handleCancelSession(
                                                                                                    session.id,
                                                                                                    cls.id
                                                                                                )
                                                                                            }
                                                                                            className="rounded-none border border-[#cc0000] px-3 py-1 text-xs text-[#cc0000] hover:bg-[#cc0000] hover:text-white"
                                                                                        >
                                                                                            Confirm
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                setCancelConfirm(null)
                                                                                            }
                                                                                            className="rounded-none border border-zinc-600 px-3 py-1 text-xs text-white hover:border-white"
                                                                                        >
                                                                                            Back
                                                                                        </button>
                                                                                    </>
                                                                                ) : (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            setCancelConfirm(
                                                                                                session.id
                                                                                            )
                                                                                        }
                                                                                        className="rounded-none border border-[#cc0000] px-3 py-1 text-xs text-[#cc0000] hover:bg-[#cc0000] hover:text-white"
                                                                                    >
                                                                                        Cancel Session
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
