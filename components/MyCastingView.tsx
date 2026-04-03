"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SessionUser } from "@/lib/session";

// ─── Types ───────────────────────────────────────────────────────────────────

type Student = {
    id: string;
    name: string;
    instrument: string | null;
};

type AssignmentRow = {
    id: string;
    status: string;
    is_conflict_override: boolean;
    slot_label: string;
    type_name: string | null;
    song_id: string;
    song_title: string;
    artist: string;
    has_method_lesson: boolean;
    order_index: number;
    show_group_id: string;
    show_group_name: string;
    day_of_week: string | null;
    start_time: string | null;
    end_time: string | null;
    end_date: string | null;
    season_key: string;
    year: number;
};

type SongGroup = {
    song_id: string;
    song_title: string;
    artist: string;
    has_method_lesson: boolean;
    order_index: number;
    roles: { slot_label: string; type_name: string | null; is_conflict_override: boolean }[];
};

type ShowGroupData = {
    id: string;
    name: string;
    day_of_week: string | null;
    start_time: string | null;
    end_time: string | null;
    end_date: string | null;
    season_key: string;
    year: number;
    songs: SongGroup[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(time: string | null): string {
    if (!time) return "";
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDayOfWeek(day: string | null): string {
    if (!day) return "";
    return day.charAt(0).toUpperCase() + day.slice(1) + "s";
}

function formatSeasonLabel(seasonKey: string, year: number): string {
    const label =
        seasonKey === "fall" ? "Fall"
        : seasonKey === "spring" ? "Spring"
        : seasonKey === "summer" ? "Summer"
        : seasonKey.charAt(0).toUpperCase() + seasonKey.slice(1);
    return `${label} ${year}`.toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MyCastingView({
    currentUser,
    schoolId,
    schoolName,
}: {
    currentUser: SessionUser | null;
    schoolId: string;
    schoolName: string;
}) {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");
    const [showGroups, setShowGroups] = useState<ShowGroupData[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(true);

    // Load performance program students at this school
    useEffect(() => {
        async function loadStudents() {
            setLoadingStudents(true);
            const { data, error } = await supabase
                .from("students")
                .select("id, name, instrument")
                .eq("school_id", schoolId)
                .eq("program", "performance_program")
                .order("name");
            if (error) {
                console.error("MyCastingView load students error:", error);
            } else {
                setStudents(data ?? []);
            }
            setLoadingStudents(false);
        }
        loadStudents();
    }, [schoolId]);

    // Load approved cast assignments for selected student
    useEffect(() => {
        if (!selectedStudentId) {
            setShowGroups([]);
            return;
        }

        async function loadAssignments() {
            setLoading(true);
            const { data, error } = await supabase
                .from("show_song_cast_assignments")
                .select(`
                    id,
                    status,
                    is_conflict_override,
                    show_song_cast_slots!inner (
                        slot_label,
                        cast_slot_type_id,
                        cast_slot_types ( name ),
                        show_group_songs!inner (
                            id,
                            title,
                            artist,
                            has_method_lesson,
                            casting_status,
                            order_index,
                            show_group_instances!inner (
                                id,
                                name,
                                day_of_week,
                                start_time,
                                end_time,
                                end_date,
                                school_id,
                                seasons!inner (
                                    season_key,
                                    year
                                )
                            )
                        )
                    )
                `)
                .eq("student_id", selectedStudentId);

            if (error) {
                console.error("MyCastingView load assignments error:", error);
                setShowGroups([]);
                setLoading(false);
                return;
            }

            // Flatten nested result and filter
            const rows: AssignmentRow[] = [];
            for (const row of (data ?? []) as any[]) {
                const slot = row.show_song_cast_slots;
                if (!slot) continue;
                const song = slot.show_group_songs;
                if (!song) continue;
                if (song.casting_status !== "approved") continue;
                const sgi = song.show_group_instances;
                if (!sgi) continue;
                if (sgi.school_id !== schoolId) continue;
                const season = sgi.seasons;
                if (!season) continue;

                rows.push({
                    id: row.id,
                    status: row.status,
                    is_conflict_override: row.is_conflict_override ?? false,
                    slot_label: slot.slot_label,
                    type_name: slot.cast_slot_types?.name ?? null,
                    song_id: song.id,
                    song_title: song.title,
                    artist: song.artist,
                    has_method_lesson: song.has_method_lesson ?? false,
                    order_index: song.order_index,
                    show_group_id: sgi.id,
                    show_group_name: sgi.name,
                    day_of_week: sgi.day_of_week,
                    start_time: sgi.start_time,
                    end_time: sgi.end_time,
                    end_date: sgi.end_date,
                    season_key: season.season_key,
                    year: season.year,
                });
            }

            // Group by show group, then by song within each group
            const groupMap = new Map<string, ShowGroupData>();
            for (const row of rows) {
                if (!groupMap.has(row.show_group_id)) {
                    groupMap.set(row.show_group_id, {
                        id: row.show_group_id,
                        name: row.show_group_name,
                        day_of_week: row.day_of_week,
                        start_time: row.start_time,
                        end_time: row.end_time,
                        end_date: row.end_date,
                        season_key: row.season_key,
                        year: row.year,
                        songs: [],
                    });
                }
                const group = groupMap.get(row.show_group_id)!;
                let songGroup = group.songs.find((s) => s.song_id === row.song_id);
                if (!songGroup) {
                    songGroup = {
                        song_id: row.song_id,
                        song_title: row.song_title,
                        artist: row.artist,
                        has_method_lesson: row.has_method_lesson,
                        order_index: row.order_index,
                        roles: [],
                    };
                    group.songs.push(songGroup);
                }
                songGroup.roles.push({
                    slot_label: row.slot_label,
                    type_name: row.type_name,
                    is_conflict_override: row.is_conflict_override,
                });
            }

            // Sort songs within each group by order_index
            for (const group of groupMap.values()) {
                group.songs.sort((a, b) => a.order_index - b.order_index);
            }

            setShowGroups([...groupMap.values()]);
            setLoading(false);
        }

        loadAssignments();
    }, [selectedStudentId, schoolId]);

    const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;
    const hasAssignments = showGroups.some((g) => g.songs.length > 0);

    return (
        <div className="min-h-screen bg-white p-6 space-y-6">

            {/* Page header */}
            <div className="bg-[#111111] rounded-none p-6">
                <h1 className="font-oswald text-3xl font-bold uppercase tracking-wide">
                    <span style={{ color: "#cc0000" }}>MY</span>{" "}
                    <span className="italic text-white">CASTING</span>
                </h1>
                <div className="mt-1 h-0.5 w-16 bg-[#cc0000]" />
                {schoolName && (
                    <p className="mt-2 text-sm text-zinc-400">{schoolName}</p>
                )}
            </div>

            {/* Student picker */}
            <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                    Student
                </label>
                {loadingStudents ? (
                    <p className="text-sm text-zinc-500">Loading students…</p>
                ) : students.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                        No Performance Program students found at this school.
                    </p>
                ) : (
                    <select
                        className="w-full max-w-xs bg-[#111111] text-white rounded-none px-3 py-2 text-sm border border-zinc-700 outline-none"
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                        <option value="">— Select a student —</option>
                        {students.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}{s.instrument ? ` · ${s.instrument}` : ""}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Prompt when nothing selected */}
            {!selectedStudentId && !loadingStudents && students.length > 0 && (
                <div className="bg-[#111111] rounded-none p-6">
                    <p className="text-sm text-zinc-500">
                        Select a student above to view their casting assignments.
                    </p>
                </div>
            )}

            {/* Results */}
            {selectedStudentId && (
                <>
                    {loading ? (
                        <p className="text-sm text-zinc-500">Loading assignments…</p>
                    ) : !hasAssignments ? (
                        <div className="bg-[#111111] rounded-none p-6 space-y-2">
                            <p className="text-sm text-zinc-300">
                                No approved casting assignments yet for{" "}
                                <span className="font-semibold text-white">
                                    {selectedStudent?.name ?? "this student"}
                                </span>
                                .
                            </p>
                            <p className="text-sm text-zinc-500">
                                Check back after your instructor submits and the Music Director approves your casting.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {showGroups.map((group) => {
                                const groupUniqueRoles = Array.from(
                                    new Set(
                                        group.songs.flatMap((s) =>
                                            s.roles.map((r) => r.slot_label)
                                        )
                                    )
                                );
                                const showDate = group.end_date
                                    ? new Date(group.end_date).toLocaleDateString("en-US", {
                                          month: "long",
                                          day: "numeric",
                                          year: "numeric",
                                      })
                                    : null;

                                return (
                                    <div key={group.id} className="space-y-3">

                                        {/* Show group header */}
                                        <div className="bg-[#111111] rounded-none p-5">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <h2 className="font-oswald text-xl font-bold uppercase tracking-wide text-white">
                                                        {group.name}
                                                    </h2>
                                                    {(group.day_of_week || group.start_time) && (
                                                        <p className="mt-1 text-sm text-zinc-400">
                                                            {formatDayOfWeek(group.day_of_week)}
                                                            {group.start_time && group.end_time
                                                                ? ` · ${formatTime(group.start_time)} – ${formatTime(group.end_time)}`
                                                                : group.start_time
                                                                  ? ` · ${formatTime(group.start_time)}`
                                                                  : ""}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="rounded-none bg-zinc-700 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">
                                                    {formatSeasonLabel(group.season_key, group.year)}
                                                </span>
                                            </div>

                                            {/* Summary row */}
                                            <div className="mt-4 flex flex-wrap gap-6 rounded-none bg-[#1a1a1a] p-4">
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                                                        Songs this season
                                                    </div>
                                                    <div className="mt-1 font-oswald text-2xl font-bold text-white">
                                                        {group.songs.length}
                                                    </div>
                                                </div>
                                                {groupUniqueRoles.length > 0 && (
                                                    <div>
                                                        <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                                                            Your roles
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {groupUniqueRoles.map((role) => (
                                                                <span
                                                                    key={role}
                                                                    className="rounded-none bg-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-widest text-zinc-300"
                                                                >
                                                                    {role}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {showDate && (
                                                    <div>
                                                        <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                                                            Show date
                                                        </div>
                                                        <div className="mt-1 text-sm font-semibold text-white">
                                                            {showDate}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Song tiles */}
                                        <div className="space-y-2">
                                            {group.songs.map((song, idx) => (
                                                <div
                                                    key={song.song_id}
                                                    className="flex flex-wrap items-start justify-between gap-4 rounded-none bg-[#1a1a1a] p-4"
                                                >
                                                    {/* Left — song info */}
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-8 shrink-0 text-right font-oswald text-xl font-bold text-zinc-600">
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <div className="font-oswald text-lg font-bold uppercase leading-tight tracking-wide text-white">
                                                                {song.song_title}
                                                            </div>
                                                            <div className="mt-0.5 text-sm text-zinc-400">
                                                                {song.artist}
                                                            </div>
                                                            {song.has_method_lesson && (
                                                                <div className="mt-2 flex items-center gap-2">
                                                                    <span className="rounded-none bg-green-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-green-300">
                                                                        Method App
                                                                    </span>
                                                                    <a
                                                                        href="https://app.methodapp.com"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs text-green-400 underline hover:text-green-300"
                                                                    >
                                                                        Open in Method App →
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right — role badges */}
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        {song.roles.map((role, rIdx) => (
                                                            <div key={rIdx} className="flex items-center gap-1.5">
                                                                {role.is_conflict_override && (
                                                                    <span className="rounded-none bg-orange-900 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-orange-300">
                                                                        Override
                                                                    </span>
                                                                )}
                                                                {role.type_name && (
                                                                    <span className="rounded-none bg-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-widest text-zinc-300">
                                                                        {role.type_name}
                                                                    </span>
                                                                )}
                                                                <span className="rounded-none bg-[#cc0000] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-white">
                                                                    {role.slot_label}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
