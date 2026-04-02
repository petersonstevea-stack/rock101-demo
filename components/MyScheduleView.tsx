"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ViewMode = "today" | "week";

type ClassSessionRow = {
    id: string;
    session_date: string;
    start_time: string | null;
    end_time: string | null;
    notes: string | null;
    instructor_override_user_id: string | null;
    rock_classes: {
        id: string;
        name: string;
        student_ids: string[] | null;
        class_instructor_id: string | null;
    } | null;
};

type LessonSessionRow = {
    id: string;
    session_date: string;
    status: string;
    absent: boolean | null;
    instructor_submitted: boolean | null;
    instructor_override_id: string | null;
    private_lesson_enrollments: {
        id: string;
        instrument: string;
        program: string;
        start_time: string | null;
        students: {
            first_name: string;
            last_initial: string | null;
        } | null;
    } | null;
};

type MyScheduleViewProps = {
    staffId: string;
    schoolId: string;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getToday(): string {
    return new Date().toISOString().slice(0, 10);
}

function getWeekRange(): { start: string; end: string } {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
        start: mon.toISOString().slice(0, 10),
        end: sun.toISOString().slice(0, 10),
    };
}

function formatHeaderDate(mode: ViewMode): string {
    const now = new Date();
    if (mode === "today") {
        const day = DAY_NAMES[now.getDay()];
        const month = now.toLocaleDateString("en-US", { month: "long" });
        const date = now.getDate();
        return `Today — ${day}, ${month} ${date}`;
    }
    const { start, end } = getWeekRange();
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    const fmt = (d: Date) =>
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `This Week — ${fmt(s)} – ${fmt(e)}`;
}

function formatTime(time: string | null): string {
    if (!time) return "";
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

function getDayName(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return DAY_NAMES[d.getDay()];
}

const labelClass = "text-xs uppercase tracking-[0.2em] text-zinc-500";
const sectionHeaderClass = "sor-display text-3xl md:text-4xl leading-none";

export default function MyScheduleView({ staffId, schoolId }: MyScheduleViewProps) {
    const [mode, setMode] = useState<ViewMode>("today");
    const [classSessions, setClassSessions] = useState<ClassSessionRow[]>([]);
    const [lessonSessions, setLessonSessions] = useState<LessonSessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [absentUpdating, setAbsentUpdating] = useState<string | null>(null);

    useEffect(() => {
        if (!staffId) { setLoading(false); return; }
        if (!schoolId) return;
        loadData();
    }, [staffId, schoolId, mode]);

    async function loadData() {
        setLoading(true);

        const today = getToday();
        const { start, end } = getWeekRange();
        const dateStart = mode === "today" ? today : start;
        const dateEnd = mode === "today" ? today : end;

        try {
            const [classRes, lessonRes] = await Promise.all([
                supabase
                    .from("class_sessions")
                    .select("id, session_date, start_time, end_time, notes, instructor_override_user_id, rock_classes(id, name, student_ids, class_instructor_id)")
                    .gte("session_date", dateStart)
                    .lte("session_date", dateEnd)
                    .eq("rock_classes.school_id", schoolId),

                supabase
                    .from("private_lesson_sessions")
                    .select("id, session_date, status, absent, instructor_submitted, instructor_override_id, private_lesson_enrollments(id, instrument, program, start_time, students(first_name, last_initial))")
                    .gte("session_date", dateStart)
                    .lte("session_date", dateEnd)
                    .neq("status", "cancelled"),
            ]);

            // Filter class sessions to this staff member
            const rawClasses = (classRes.data ?? []) as unknown as ClassSessionRow[];
            const myClasses = rawClasses.filter((s) => {
                if (!s.rock_classes) return false;
                return (
                    s.rock_classes.class_instructor_id === staffId ||
                    s.instructor_override_user_id === staffId
                );
            });

            // Filter lesson sessions to this staff member
            const rawLessons = (lessonRes.data ?? []) as unknown as LessonSessionRow[];
            const myLessons = rawLessons.filter((s) => {
                if (!s.private_lesson_enrollments) return false;
                // instructor_id is on the enrollment; check via join
                return s.instructor_override_id === staffId;
            });

            setClassSessions(myClasses);
            setLessonSessions(myLessons);
        } finally {
            setLoading(false);
        }
    }

    async function toggleAbsent(sessionId: string, current: boolean | null) {
        setAbsentUpdating(sessionId);
        const newVal = !current;
        await supabase
            .from("private_lesson_sessions")
            .update({ absent: newVal })
            .eq("id", sessionId);
        setLessonSessions((prev) =>
            prev.map((s) => (s.id === sessionId ? { ...s, absent: newVal } : s))
        );
        setAbsentUpdating(null);
    }

    const hasAnySessions = classSessions.length > 0 || lessonSessions.length > 0;

    // Group by day for weekly view
    function groupByDay<T extends { session_date: string }>(items: T[]): Record<string, T[]> {
        const groups: Record<string, T[]> = {};
        for (const item of items) {
            const day = getDayName(item.session_date);
            if (!groups[day]) groups[day] = [];
            groups[day].push(item);
        }
        return groups;
    }

    const classsByDay = groupByDay(classSessions);
    const lessonsByDay = groupByDay(lessonSessions);
    const activeDays = WEEK_ORDER.filter(
        (d) => (classsByDay[d]?.length ?? 0) > 0 || (lessonsByDay[d]?.length ?? 0) > 0
    );

    function renderClassCard(session: ClassSessionRow) {
        const rc = session.rock_classes;
        const studentCount = rc?.student_ids?.length ?? 0;
        const hasNotes = !!session.notes?.trim();

        return (
            <div
                key={session.id}
                className="bg-[#1a1a1a] rounded-none border-l-2 border-l-[#cc0000] px-4 py-3"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-semibold">{rc?.name ?? "—"}</div>
                        <div className="mt-1 text-zinc-400 text-xs">
                            {formatSessionDate(session.session_date)}
                            {session.start_time ? ` · ${formatTime(session.start_time)}` : ""}
                            {session.end_time ? ` – ${formatTime(session.end_time)}` : ""}
                        </div>
                        <div className="mt-1 text-zinc-500 text-xs">
                            {studentCount} {studentCount === 1 ? "student" : "students"}
                        </div>
                    </div>
                    <div className="shrink-0 text-xs font-medium" style={{ color: hasNotes ? "#4ade80" : "#cc0000" }}>
                        {hasNotes ? "Notes saved" : "No notes"}
                    </div>
                </div>
            </div>
        );
    }

    function renderLessonCard(session: LessonSessionRow) {
        const enroll = session.private_lesson_enrollments;
        const student = enroll?.students;
        const studentName = student
            ? `${student.first_name} ${student.last_initial ?? ""}`.trim()
            : "—";
        const isRock101 = enroll?.program === "rock101";
        const borderColor = isRock101 ? "#cc0000" : "#ffffff";

        return (
            <div
                key={session.id}
                className="bg-[#1a1a1a] rounded-none px-4 py-3"
                style={{ borderLeft: `2px solid ${borderColor}` }}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white text-sm font-semibold">{studentName}</span>
                            <span className="text-zinc-500 text-xs">·</span>
                            <span className="text-zinc-400 text-xs capitalize">{enroll?.instrument ?? "—"}</span>
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
                        <div className="mt-1 text-zinc-400 text-xs">
                            {formatSessionDate(session.session_date)}
                            {enroll?.start_time ? ` · ${formatTime(enroll.start_time)}` : ""}
                        </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                        <div className="text-xs font-medium" style={{ color: session.instructor_submitted ? "#4ade80" : "#cc0000" }}>
                            {session.instructor_submitted ? "✓ submitted" : "⚠ not submitted"}
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={!!session.absent}
                                disabled={absentUpdating === session.id}
                                onChange={() => toggleAbsent(session.id, session.absent)}
                                className="accent-[#cc0000]"
                            />
                            <span className="text-zinc-400 text-xs">Absent</span>
                        </label>
                    </div>
                </div>
            </div>
        );
    }

    function renderDaySection(day: string) {
        const daySessions = classsByDay[day] ?? [];
        const dayLessons = lessonsByDay[day] ?? [];
        if (daySessions.length === 0 && dayLessons.length === 0) return null;

        return (
            <div key={day}>
                <div className="mb-2 text-sm font-semibold text-zinc-400 uppercase tracking-[0.15em]">{day}</div>
                <div className="grid gap-2">
                    {daySessions.map(renderClassCard)}
                    {dayLessons.map(renderLessonCard)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="text-white text-sm font-medium">{formatHeaderDate(mode)}</div>
                <div className="flex rounded-none overflow-hidden border border-zinc-700">
                    <button
                        type="button"
                        onClick={() => setMode("today")}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors"
                        style={{
                            backgroundColor: mode === "today" ? "#cc0000" : "transparent",
                            color: "#ffffff",
                        }}
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("week")}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors border-l border-zinc-700"
                        style={{
                            backgroundColor: mode === "week" ? "#cc0000" : "transparent",
                            color: "#ffffff",
                        }}
                    >
                        This Week
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-zinc-400 text-sm">Loading schedule…</div>
            ) : !hasAnySessions ? (
                <div className="bg-[#111111] rounded-none p-6 text-center space-y-4">
                    <div className="text-zinc-400 text-sm">
                        {mode === "today" ? "No sessions today." : "No sessions this week."}
                    </div>
                    {mode === "today" && (
                        <button
                            type="button"
                            onClick={() => setMode("week")}
                            className="rounded-none bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors"
                        >
                            View Full Week
                        </button>
                    )}
                </div>
            ) : mode === "today" ? (
                <>
                    {/* MY CLASSES */}
                    {classSessions.length > 0 && (
                        <div className="bg-[#111111] rounded-none p-5">
                            <h2 className={sectionHeaderClass}>
                                <span style={{ color: "#cc0000" }}>MY</span>
                                <span className="ml-2 text-white italic normal-case">Classes</span>
                            </h2>
                            <div className="sor-divider" />
                            <div className="grid gap-2">
                                {classSessions.map(renderClassCard)}
                            </div>
                        </div>
                    )}

                    {/* MY LESSONS */}
                    {lessonSessions.length > 0 && (
                        <div className="bg-[#111111] rounded-none p-5">
                            <h2 className={sectionHeaderClass}>
                                <span style={{ color: "#cc0000" }}>MY</span>
                                <span className="ml-2 text-white italic normal-case">Lessons</span>
                            </h2>
                            <div className="sor-divider" />
                            <div className="grid gap-2">
                                {lessonSessions.map(renderLessonCard)}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* WEEKLY VIEW */
                <div className="bg-[#111111] rounded-none p-5">
                    <h2 className={sectionHeaderClass}>
                        <span style={{ color: "#cc0000" }}>THIS</span>
                        <span className="ml-2 text-white italic normal-case">Week</span>
                    </h2>
                    <div className="sor-divider" />
                    <div className="grid gap-6">
                        {activeDays.map(renderDaySection)}
                    </div>
                </div>
            )}
        </div>
    );
}
