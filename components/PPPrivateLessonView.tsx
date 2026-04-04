"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PPPrivateLessonViewProps = {
    studentId: string;
    studentName: string;
    instrument: string;
    schoolId: string;
    instructorName: string;
};

type EnrollmentRow = {
    id: string;
    instrument: string;
    program: string;
    day_of_week: string;
    start_time: string | null;
    instructor_id: string | null;
};

type SessionRow = {
    id: string;
    session_date: string;
    absent: boolean | null;
    instructor_submitted: boolean | null;
    notes: string | null;
    music_theory_assignment: string | null;
    method_app_exercises: string | null;
    status: string;
};

type CastSlotType = {
    name: string;
};

type ThemeSong = {
    id: string;
    title: string;
    artist: string;
};

type ShowGroupSong = {
    id: string;
    theme_songs: ThemeSong | null;
};

type ShowSongCastSlot = {
    id: string;
    show_group_songs: ShowGroupSong | null;
    cast_slot_types: CastSlotType | null;
};

type CastAssignment = {
    id: string;
    is_understudy: boolean | null;
    show_song_cast_slots: ShowSongCastSlot | null;
};

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
    return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

export default function PPPrivateLessonView({
    studentId,
    studentName,
    instrument,
    schoolId,
    instructorName,
}: PPPrivateLessonViewProps) {
    const [enrollment, setEnrollment] = useState<EnrollmentRow | null>(null);
    const [session, setSession] = useState<SessionRow | null>(null);
    const [castAssignments, setCastAssignments] = useState<CastAssignment[]>([]);
    const [loading, setLoading] = useState(true);

    const [notes, setNotes] = useState("");
    const [musicTheory, setMusicTheory] = useState("");
    const [methodAppExercises, setMethodAppExercises] = useState("");
    const [absent, setAbsent] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");

    const firstName = studentName.split(" ")[0] ?? studentName;

    useEffect(() => {
        if (!studentId) return;
        loadData();
    }, [studentId]);

    async function loadData() {
        setLoading(true);

        const { data: enrollmentData } = await supabase
            .from("private_lesson_enrollments")
            .select("id, instrument, program, day_of_week, start_time, instructor_id")
            .eq("student_id", studentId)
            .eq("program", "performance_program")
            .eq("active", true)
            .maybeSingle();

        setEnrollment(enrollmentData as EnrollmentRow | null);

        if (enrollmentData?.id) {
            const today = new Date().toISOString().slice(0, 10);

            const { data: sessionData } = await supabase
                .from("private_lesson_sessions")
                .select("id, session_date, absent, instructor_submitted, notes, music_theory_assignment, method_app_exercises, status")
                .eq("enrollment_id", enrollmentData.id)
                .eq("status", "scheduled")
                .gte("session_date", today)
                .order("session_date", { ascending: true })
                .limit(1)
                .maybeSingle();

            if (sessionData) {
                setSession(sessionData as SessionRow);
                setNotes(sessionData.notes ?? "");
                setMusicTheory(sessionData.music_theory_assignment ?? "");
                setMethodAppExercises(sessionData.method_app_exercises ?? "");
                setAbsent(sessionData.absent ?? false);
            }
        }

        const { data: castData } = await supabase
            .from("show_song_cast_assignments")
            .select(`
                id,
                is_understudy,
                show_song_cast_slots (
                    id,
                    show_group_songs (
                        id,
                        theme_songs (
                            id,
                            title,
                            artist
                        )
                    ),
                    cast_slot_types (
                        name
                    )
                )
            `)
            .eq("student_id", studentId)
            .eq("status", "confirmed");

        setCastAssignments((castData ?? []) as unknown as CastAssignment[]);
        setLoading(false);
    }

    async function handleNoShow() {
        if (!session) return;
        setSaving(true);
        await supabase
            .from("private_lesson_sessions")
            .update({
                absent: true,
                instructor_submitted: true,
                instructor_submitted_at: new Date().toISOString(),
                status: "no_show",
            })
            .eq("id", session.id);
        setAbsent(true);
        setSession((prev) => prev ? { ...prev, absent: true, instructor_submitted: true, status: "no_show" } : prev);
        setSaveMessage("Marked as no show");
        setSaving(false);
    }

    async function handleSubmit() {
        if (!session) return;
        setSaving(true);
        await supabase
            .from("private_lesson_sessions")
            .update({
                notes,
                music_theory_assignment: musicTheory,
                method_app_exercises: methodAppExercises,
                instructor_submitted: true,
                instructor_submitted_at: new Date().toISOString(),
            })
            .eq("id", session.id);
        setSession((prev) => prev ? { ...prev, instructor_submitted: true } : prev);
        setSaveMessage("Lesson saved");
        setSaving(false);
    }

    if (loading) {
        return (
            <div className="p-6 text-zinc-400 text-sm">Loading lesson data…</div>
        );
    }

    if (!enrollment) {
        return (
            <div className="p-6">
                <div className="bg-[#111111] rounded-none p-5 text-zinc-400 text-sm">
                    No active Performance Program lesson enrollment found for this student.
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">

            {/* CASTING CARD */}
            <div className="bg-[#111111] rounded-none p-5">
                <h2 className="sor-display text-3xl md:text-4xl leading-none">
                    <span style={{ color: "#cc0000" }}>CURRENT</span>
                    <span className="ml-2 text-white italic normal-case">Casting</span>
                </h2>
                <div className="sor-divider" />

                {castAssignments.length === 0 ? (
                    <p className="text-zinc-500 text-sm">No casting assigned.</p>
                ) : (
                    <div className="grid gap-2 mt-2">
                        {castAssignments.map((ca) => {
                            const slot = ca.show_song_cast_slots;
                            const song = slot?.show_group_songs?.theme_songs;
                            const slotType = slot?.cast_slot_types?.name ?? "";

                            return (
                                <div
                                    key={ca.id}
                                    className="bg-[#1a1a1a] rounded-none px-4 py-3 flex items-center gap-3 flex-wrap"
                                >
                                    <div className="flex-1 min-w-0">
                                        <span className="text-white text-sm font-medium">
                                            {song?.title ?? "Unknown Song"}
                                        </span>
                                        {song?.artist && (
                                            <span className="text-zinc-400 text-sm"> — {song.artist}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {slotType && (
                                            <span className="rounded-none px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white bg-zinc-700">
                                                {slotType}
                                            </span>
                                        )}
                                        {ca.is_understudy && (
                                            <span className="rounded-none px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white bg-zinc-600">
                                                Understudy
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* SESSION CARD */}
            {!session ? (
                <div className="bg-[#111111] rounded-none p-5 text-zinc-400 text-sm">
                    No upcoming sessions scheduled.
                </div>
            ) : (
                <div className="bg-[#111111] rounded-none p-5 space-y-5">
                    <div>
                        <h2 className="sor-display text-3xl md:text-4xl leading-none">
                            <span style={{ color: "#cc0000" }}>SESSION</span>
                            <span className="ml-2 text-white italic normal-case">
                                {formatSessionDate(session.session_date)}
                                {enrollment.start_time ? ` · ${formatTime(enrollment.start_time)}` : ""}
                            </span>
                        </h2>
                        <div className="sor-divider" />
                    </div>

                    {session.instructor_submitted && (
                        <div className="text-sm font-medium" style={{ color: "#4ade80" }}>
                            ✓ Submitted
                        </div>
                    )}

                    {absent ? (
                        <p className="text-zinc-400 text-sm">This session was marked as no show.</p>
                    ) : (
                        <>
                            {/* LESSON NOTES */}
                            <div>
                                <label className="mb-2 block text-sm text-zinc-400">
                                    {instructorName}&apos;s lesson note for {firstName}
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    disabled={!!session.instructor_submitted}
                                    rows={4}
                                    placeholder="Lesson notes for this session..."
                                    className="w-full rounded-none border border-zinc-700 bg-black px-4 py-3 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none disabled:opacity-50 resize-none"
                                />
                            </div>

                            {/* MUSIC THEORY ASSIGNMENT */}
                            <div>
                                <label className="mb-2 block text-sm text-zinc-400">
                                    Weekly Music Theory Assignment
                                </label>
                                <textarea
                                    value={musicTheory}
                                    onChange={(e) => setMusicTheory(e.target.value)}
                                    disabled={!!session.instructor_submitted}
                                    rows={3}
                                    placeholder="Music theory concepts to study..."
                                    className="w-full rounded-none border border-zinc-700 bg-black px-4 py-3 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none disabled:opacity-50 resize-none"
                                />
                            </div>

                            {/* METHOD APP EXERCISES */}
                            <div>
                                <label className="mb-2 block text-sm text-zinc-400">
                                    Method App Exercises
                                </label>
                                <textarea
                                    value={methodAppExercises}
                                    onChange={(e) => setMethodAppExercises(e.target.value)}
                                    disabled={!!session.instructor_submitted}
                                    rows={3}
                                    placeholder={`Paste a Method App URL or describe an exercise — e.g. https://method.schoolofrock.com/comp.html#/exercise/84656`}
                                    className="w-full rounded-none border border-zinc-700 bg-black px-4 py-3 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none disabled:opacity-50 resize-none"
                                />
                            </div>

                            {/* BUTTONS */}
                            {!session.instructor_submitted && (
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleNoShow}
                                        disabled={saving}
                                        className="rounded-none bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-600 disabled:opacity-50 transition"
                                    >
                                        No Show
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={saving}
                                        className="rounded-none bg-[#cc0000] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b30000] disabled:opacity-50 transition"
                                    >
                                        {saving ? "Saving…" : "Submit"}
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {saveMessage && (
                        <p className="text-sm text-zinc-300">{saveMessage}</p>
                    )}
                </div>
            )}
        </div>
    );
}
