"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SessionUser } from "@/lib/session";

// ─── Types ──────────────────────────────────────────────────────────────────

type ShowGroup = {
    id: string;
    name: string;
    school_id: string;
    day_of_week: string | null;
    start_time: string | null;
    end_time: string | null;
    start_date: string | null;
    end_date: string | null;
    class_instructor_id: string | null;
    status: string;
    season_name?: string | null;
};

type Rehearsal = {
    id: string;
    show_group_instance_id: string;
    rehearsal_date: string;
    instructor_user_id: string | null;
    notes: string | null;
};

type AttendanceStatus = "present" | "absent" | "late" | "excused";

type AttendanceRecord = {
    id: string;
    rehearsal_id: string;
    student_id: string;
    status: AttendanceStatus;
    notes: string | null;
};

type RehearsalSong = {
    id: string;
    rehearsal_id: string;
    show_group_song_id: string;
    is_focus: boolean;
    priority_order: number | null;
    readiness_grade: number | null;
    notes: string | null;
};

type ShowGroupSong = {
    id: string;
    show_group_instance_id: string;
    title: string;
    artist: string;
    order_index: number;
    casting_status: string;
    has_method_lesson: boolean;
    unlocked_by: string | null;
    unlocked_at: string | null;
    unlock_reason: string | null;
};

type RehearsalAward = {
    id: string;
    rehearsal_id: string;
    student_id: string;
    behavior_id: string;
    award_type: "instructor" | "peer";
    nominated_by_student_id: string | null;
    status: "pending" | "approved" | "rejected";
    notes: string | null;
};

type Behavior = {
    id: string;
    label: string;
    sort_order: number;
};

type Membership = {
    id: string;
    student_id: string;
    status: string;
};

type StudentRow = {
    id: string;
    firstName: string;
    lastInitial: string;
    instrument: string;
    schoolId: string;
    program: string;
    active: boolean;
};

type PerformanceRehearsalViewProps = {
    currentUser: SessionUser | null;
    schoolId: string;
    schoolName: string;
    students: StudentRow[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
    monday: "Mon", tuesday: "Tue", wednesday: "Wed",
    thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const ATTENDANCE_CYCLE: AttendanceStatus[] = ["present", "late", "absent", "excused"];

const GRADE_LABELS: Record<number, { label: string; color: string }> = {
    1: { label: "NEEDS WORK", color: "bg-[#cc0000] text-white" },
    2: { label: "DEVELOPING", color: "bg-yellow-700 text-yellow-200" },
    3: { label: "READY", color: "bg-green-800 text-green-300" },
    4: { label: "SHOW READY", color: "bg-green-600 text-white" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(t: string | null): string {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function todayStr(): string {
    return new Date().toISOString().split("T")[0];
}

function attendanceColor(status: AttendanceStatus): string {
    switch (status) {
        case "present": return "text-white";
        case "late": return "text-yellow-400";
        case "absent": return "text-red-400";
        case "excused": return "text-zinc-400";
    }
}

function attendanceBg(status: AttendanceStatus): string {
    switch (status) {
        case "present": return "bg-zinc-700 text-white";
        case "late": return "bg-yellow-900 text-yellow-300";
        case "absent": return "bg-red-950 text-red-400";
        case "excused": return "bg-zinc-800 text-zinc-400";
    }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PerformanceRehearsalView({
    currentUser,
    schoolId,
    schoolName,
    students,
}: PerformanceRehearsalViewProps) {
    const role = currentUser?.role ?? "";

    // ── Show groups ──────────────────────────────────────────────────────────
    const [showGroups, setShowGroups] = useState<ShowGroup[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    // ── Session ──────────────────────────────────────────────────────────────
    const [selectedDate, setSelectedDate] = useState<string>(todayStr());
    const [rehearsal, setRehearsal] = useState<Rehearsal | null>(null);
    const [loadingRehearsal, setLoadingRehearsal] = useState(false);
    const [startingRehearsal, setStartingRehearsal] = useState(false);
    const [notesValue, setNotesValue] = useState("");

    // ── Attendance ───────────────────────────────────────────────────────────
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

    // ── Songs ────────────────────────────────────────────────────────────────
    const [showGroupSongs, setShowGroupSongs] = useState<ShowGroupSong[]>([]);
    const [rehearsalSongs, setRehearsalSongs] = useState<RehearsalSong[]>([]);
    const [priorRehearsalSongs, setPriorRehearsalSongs] = useState<RehearsalSong[]>([]);
    const [rehearsedSongIds, setRehearsedSongIds] = useState<Set<string>>(new Set());

    // ── Awards ───────────────────────────────────────────────────────────────
    const [behaviors, setBehaviors] = useState<Behavior[]>([]);
    const [awards, setAwards] = useState<RehearsalAward[]>([]);
    const [seasonAwardCounts, setSeasonAwardCounts] = useState<Record<string, number>>({});
    const [peerNomineeId, setPeerNomineeId] = useState("");
    const [peerBehaviorId, setPeerBehaviorId] = useState("");
    const [peerNote, setPeerNote] = useState("");
    const [submittingNomination, setSubmittingNomination] = useState(false);

    // ── Casting lock state ───────────────────────────────────────────────────
    const [unlockPanelSongId, setUnlockPanelSongId] = useState<string | null>(null);
    const [unlockReasonText, setUnlockReasonText] = useState("");

    const selectedGroup = showGroups.find((g) => g.id === selectedGroupId) ?? null;

    // ── Load show groups ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!schoolId) return;
        setLoadingGroups(true);
        supabase
            .from("show_group_instances")
            .select("*, seasons(season_key, year)")
            .eq("school_id", schoolId)
            .eq("status", "active")
            .order("name")
            .then(({ data }) => {
                if (data) {
                    setShowGroups(
                        data.map((row: any) => ({
                            id: row.id,
                            name: row.name,
                            school_id: row.school_id,
                            day_of_week: row.day_of_week,
                            start_time: row.start_time,
                            end_time: row.end_time,
                            class_instructor_id: row.class_instructor_id,
                            status: row.status,
                            start_date: row.start_date ?? null,
                            end_date: row.end_date ?? null,
                            season_name: row.seasons
                                ? row.seasons.season_key.charAt(0).toUpperCase() +
                                  row.seasons.season_key.slice(1) + " " + row.seasons.year
                                : null,
                        }))
                    );
                }
                setLoadingGroups(false);
            });
    }, [schoolId]);

    // ── Load behaviors once ──────────────────────────────────────────────────
    useEffect(() => {
        supabase
            .from("rock101_rehearsal_behaviors")
            .select("id, label, sort_order")
            .order("sort_order")
            .then(({ data }) => {
                if (data) setBehaviors(data as Behavior[]);
            });
    }, []);

    // ── Load memberships when group changes ──────────────────────────────────
    useEffect(() => {
        if (!selectedGroupId) { setMemberships([]); return; }
        supabase
            .from("show_group_student_memberships")
            .select("id, student_id, status")
            .eq("show_group_instance_id", selectedGroupId)
            .eq("status", "active")
            .then(({ data }) => {
                if (data) setMemberships(data as Membership[]);
            });
    }, [selectedGroupId]);

    // ── Load show group songs when group changes ─────────────────────────────
    useEffect(() => {
        if (!selectedGroupId) { setShowGroupSongs([]); return; }
        supabase
            .from("show_group_songs")
            .select("id, show_group_instance_id, title, artist, order_index, casting_status, has_method_lesson, unlocked_by, unlocked_at, unlock_reason")
            .eq("show_group_instance_id", selectedGroupId)
            .order("order_index")
            .then(({ data }) => {
                if (data) setShowGroupSongs(data as ShowGroupSong[]);
            });
    }, [selectedGroupId]);

    // ── Load rehearsal when group or date changes ────────────────────────────
    const loadRehearsal = useCallback(async () => {
        if (!selectedGroupId || !selectedDate) return;
        setLoadingRehearsal(true);
        setRehearsal(null);
        setAttendance([]);
        setRehearsalSongs([]);
        setAwards([]);

        const { data } = await supabase
            .from("show_group_rehearsals")
            .select("*")
            .eq("show_group_instance_id", selectedGroupId)
            .eq("rehearsal_date", selectedDate)
            .maybeSingle();

        if (data) {
            const r = data as Rehearsal;
            setRehearsal(r);
            setNotesValue(r.notes ?? "");

            // Load attendance
            const { data: attData } = await supabase
                .from("show_group_rehearsal_attendance")
                .select("*")
                .eq("rehearsal_id", r.id);
            if (attData) setAttendance(attData as AttendanceRecord[]);

            // Load rehearsal songs
            const { data: songData } = await supabase
                .from("show_group_rehearsal_songs")
                .select("*")
                .eq("rehearsal_id", r.id);
            if (songData) setRehearsalSongs(songData as RehearsalSong[]);

            // Load awards for this rehearsal
            const { data: awardData } = await supabase
                .from("show_group_rehearsal_awards")
                .select("*")
                .eq("rehearsal_id", r.id);
            if (awardData) setAwards(awardData as RehearsalAward[]);

            // Season award counts
            await loadSeasonAwardCounts(selectedGroupId);
        }

        // Load prior rehearsal songs (for auto-suggest)
        await loadPriorRehearsalSongs(selectedGroupId, selectedDate);

        setLoadingRehearsal(false);
    }, [selectedGroupId, selectedDate]);

    useEffect(() => {
        loadRehearsal();
    }, [loadRehearsal]);

    // ── Load prior rehearsal songs ───────────────────────────────────────────
    async function loadPriorRehearsalSongs(groupId: string, beforeDate: string) {
        // Get most recent rehearsal before this date
        const { data: priorRehearsal } = await supabase
            .from("show_group_rehearsals")
            .select("id")
            .eq("show_group_instance_id", groupId)
            .lt("rehearsal_date", beforeDate)
            .order("rehearsal_date", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (priorRehearsal) {
            const { data: priorSongs } = await supabase
                .from("show_group_rehearsal_songs")
                .select("*")
                .eq("rehearsal_id", priorRehearsal.id);
            if (priorSongs) setPriorRehearsalSongs(priorSongs as RehearsalSong[]);
        } else {
            setPriorRehearsalSongs([]);
        }

        // All song IDs ever rehearsed in this group
        const { data: allRehearsals } = await supabase
            .from("show_group_rehearsals")
            .select("id")
            .eq("show_group_instance_id", groupId);
        if (allRehearsals && allRehearsals.length > 0) {
            const rehearsalIds = allRehearsals.map((r: any) => r.id);
            const { data: allRehearsedSongs } = await supabase
                .from("show_group_rehearsal_songs")
                .select("show_group_song_id")
                .in("rehearsal_id", rehearsalIds);
            if (allRehearsedSongs) {
                setRehearsedSongIds(new Set(allRehearsedSongs.map((s: any) => s.show_group_song_id)));
            }
        } else {
            setRehearsedSongIds(new Set());
        }
    }

    // ── Season award counts ──────────────────────────────────────────────────
    async function loadSeasonAwardCounts(groupId: string) {
        const { data: allRehearsals } = await supabase
            .from("show_group_rehearsals")
            .select("id")
            .eq("show_group_instance_id", groupId);
        if (!allRehearsals || allRehearsals.length === 0) { setSeasonAwardCounts({}); return; }
        const rehearsalIds = allRehearsals.map((r: any) => r.id);
        const { data: allAwards } = await supabase
            .from("show_group_rehearsal_awards")
            .select("student_id, status")
            .in("rehearsal_id", rehearsalIds)
            .eq("status", "approved");
        if (!allAwards) { setSeasonAwardCounts({}); return; }
        const counts: Record<string, number> = {};
        for (const a of allAwards) {
            counts[a.student_id] = (counts[a.student_id] ?? 0) + 1;
        }
        setSeasonAwardCounts(counts);
    }

    // ── Start rehearsal ──────────────────────────────────────────────────────
    async function handleStartRehearsal() {
        if (!selectedGroupId || !currentUser) return;
        setStartingRehearsal(true);

        const { data: newRehearsal, error } = await supabase
            .from("show_group_rehearsals")
            .insert({
                show_group_instance_id: selectedGroupId,
                rehearsal_date: selectedDate,
                instructor_user_id: null,
                notes: null,
            })
            .select()
            .single();

        if (error || !newRehearsal) {
            console.error("Failed to create rehearsal:", error);
            setStartingRehearsal(false);
            return;
        }

        const r = newRehearsal as Rehearsal;
        setRehearsal(r);
        setNotesValue("");

        // Bulk insert attendance — all active members default to 'present'
        if (memberships.length > 0) {
            const attInserts = memberships.map((m) => ({
                rehearsal_id: r.id,
                student_id: m.student_id,
                status: "present",
                notes: null,
            }));
            const { data: attData } = await supabase
                .from("show_group_rehearsal_attendance")
                .insert(attInserts)
                .select();
            if (attData) setAttendance(attData as AttendanceRecord[]);
        }

        // Auto-suggest focus songs and insert them
        const suggested = computeSuggestedSongs();
        if (showGroupSongs.length > 0) {
            const songInserts = showGroupSongs
                .filter((s) => s.casting_status === "approved")
                .map((s, idx) => ({
                    rehearsal_id: r.id,
                    show_group_song_id: s.id,
                    is_focus: suggested.has(s.id),
                    priority_order: null as number | null,
                    readiness_grade: null as number | null,
                    notes: null,
                }));
            // set priority order for focused songs
            let focusPriority = 1;
            const withPriority = songInserts.map((row) => {
                if (row.is_focus) {
                    return { ...row, priority_order: focusPriority++ };
                }
                return row;
            });
            const { data: songData } = await supabase
                .from("show_group_rehearsal_songs")
                .insert(withPriority)
                .select();
            if (songData) setRehearsalSongs(songData as RehearsalSong[]);
        }

        await loadSeasonAwardCounts(selectedGroupId);
        setStartingRehearsal(false);
    }

    // ── Compute suggested focus songs ────────────────────────────────────────
    function computeSuggestedSongs(): Set<string> {
        const approvedSongs = showGroupSongs.filter((s) => s.casting_status === "approved");
        const newSongs = approvedSongs.filter((s) => !rehearsedSongIds.has(s.id));
        const priorGradeMap = new Map<string, number>();
        for (const rs of priorRehearsalSongs) {
            if (rs.readiness_grade) priorGradeMap.set(rs.show_group_song_id, rs.readiness_grade);
        }
        const lowGradeSongs = approvedSongs
            .filter((s) => {
                const g = priorGradeMap.get(s.id);
                return g !== undefined && g <= 2;
            })
            .sort((a, b) => (priorGradeMap.get(a.id) ?? 99) - (priorGradeMap.get(b.id) ?? 99));

        const suggested = new Set<string>();
        for (const s of newSongs) {
            suggested.add(s.id);
            if (suggested.size >= 4) break;
        }
        for (const s of lowGradeSongs) {
            if (suggested.size >= 4) break;
            suggested.add(s.id);
        }
        if (suggested.size < 4) {
            // Fill from songs not rehearsed recently
            const recentIds = new Set(priorRehearsalSongs.map((rs) => rs.show_group_song_id));
            for (const s of approvedSongs) {
                if (suggested.size >= 4) break;
                if (!recentIds.has(s.id) && !suggested.has(s.id)) suggested.add(s.id);
            }
        }
        return suggested;
    }

    // ── Save rehearsal notes on blur ─────────────────────────────────────────
    async function handleNotesBlur() {
        if (!rehearsal) return;
        await supabase
            .from("show_group_rehearsals")
            .update({ notes: notesValue })
            .eq("id", rehearsal.id);
    }

    // ── Toggle attendance status ─────────────────────────────────────────────
    async function handleToggleAttendance(studentId: string) {
        if (!rehearsal) return;
        const existing = attendance.find((a) => a.student_id === studentId);
        if (!existing) return;
        const currentIdx = ATTENDANCE_CYCLE.indexOf(existing.status);
        const nextStatus = ATTENDANCE_CYCLE[(currentIdx + 1) % ATTENDANCE_CYCLE.length];

        setAttendance((prev) =>
            prev.map((a) => a.student_id === studentId ? { ...a, status: nextStatus } : a)
        );
        await supabase
            .from("show_group_rehearsal_attendance")
            .update({ status: nextStatus })
            .eq("id", existing.id);
    }

    // ── Toggle song focus ────────────────────────────────────────────────────
    async function handleToggleFocus(songId: string) {
        if (!rehearsal) return;
        const existing = rehearsalSongs.find((rs) => rs.show_group_song_id === songId);
        if (!existing) return;
        const newFocus = !existing.is_focus;
        setRehearsalSongs((prev) =>
            prev.map((rs) => rs.show_group_song_id === songId ? { ...rs, is_focus: newFocus } : rs)
        );
        await supabase
            .from("show_group_rehearsal_songs")
            .update({ is_focus: newFocus })
            .eq("id", existing.id);
    }

    // ── Save song priority order ─────────────────────────────────────────────
    async function handlePriorityChange(songId: string, val: string) {
        if (!rehearsal) return;
        const existing = rehearsalSongs.find((rs) => rs.show_group_song_id === songId);
        if (!existing) return;
        const parsed = val === "" ? null : parseInt(val, 10);
        setRehearsalSongs((prev) =>
            prev.map((rs) => rs.show_group_song_id === songId ? { ...rs, priority_order: parsed } : rs)
        );
        await supabase
            .from("show_group_rehearsal_songs")
            .update({ priority_order: parsed })
            .eq("id", existing.id);
    }

    // ── Save song readiness grade ────────────────────────────────────────────
    async function handleGradeChange(songId: string, grade: number) {
        if (!rehearsal) return;
        const existing = rehearsalSongs.find((rs) => rs.show_group_song_id === songId);
        if (!existing) return;
        const newGrade = existing.readiness_grade === grade ? null : grade;
        setRehearsalSongs((prev) =>
            prev.map((rs) => rs.show_group_song_id === songId ? { ...rs, readiness_grade: newGrade } : rs)
        );
        await supabase
            .from("show_group_rehearsal_songs")
            .update({ readiness_grade: newGrade })
            .eq("id", existing.id);
    }

    // ── Save song notes on blur ──────────────────────────────────────────────
    async function handleSongNotesBlur(songId: string, val: string) {
        if (!rehearsal) return;
        const existing = rehearsalSongs.find((rs) => rs.show_group_song_id === songId);
        if (!existing) return;
        await supabase
            .from("show_group_rehearsal_songs")
            .update({ notes: val })
            .eq("id", existing.id);
    }

    // ── Toggle instructor award ──────────────────────────────────────────────
    async function handleToggleInstructorAward(studentId: string, behaviorId: string) {
        if (!rehearsal) return;
        const existing = awards.find(
            (a) => a.student_id === studentId && a.behavior_id === behaviorId &&
                   a.award_type === "instructor" && a.rehearsal_id === rehearsal.id
        );
        if (existing) {
            setAwards((prev) => prev.filter((a) => a.id !== existing.id));
            await supabase.from("show_group_rehearsal_awards").delete().eq("id", existing.id);
            await loadSeasonAwardCounts(selectedGroupId!);
        } else {
            const { data } = await supabase
                .from("show_group_rehearsal_awards")
                .insert({
                    rehearsal_id: rehearsal.id,
                    student_id: studentId,
                    behavior_id: behaviorId,
                    award_type: "instructor",
                    status: "approved",
                    nominated_by_student_id: null,
                    notes: null,
                })
                .select()
                .single();
            if (data) {
                setAwards((prev) => [...prev, data as RehearsalAward]);
                await loadSeasonAwardCounts(selectedGroupId!);
            }
        }
    }

    // ── Submit peer nomination ────────────────────────────────────────────────
    async function handleSubmitPeerNomination() {
        if (!rehearsal || !peerNomineeId || !peerBehaviorId) return;
        setSubmittingNomination(true);
        const { data } = await supabase
            .from("show_group_rehearsal_awards")
            .insert({
                rehearsal_id: rehearsal.id,
                student_id: peerNomineeId,
                behavior_id: peerBehaviorId,
                award_type: "peer",
                status: "pending",
                nominated_by_student_id: null, // staff context — no student id
                notes: peerNote.trim() || null,
            })
            .select()
            .single();
        if (data) {
            setAwards((prev) => [...prev, data as RehearsalAward]);
        }
        setPeerNomineeId("");
        setPeerBehaviorId("");
        setPeerNote("");
        setSubmittingNomination(false);
    }

    // ── Approve / reject peer nomination ─────────────────────────────────────
    async function handleAwardStatus(awardId: string, newStatus: "approved" | "rejected") {
        setAwards((prev) =>
            prev.map((a) => a.id === awardId ? { ...a, status: newStatus } : a)
        );
        await supabase
            .from("show_group_rehearsal_awards")
            .update({ status: newStatus })
            .eq("id", awardId);
        if (newStatus === "approved" && selectedGroupId) {
            await loadSeasonAwardCounts(selectedGroupId);
        }
    }

    // ── Unlock casting ────────────────────────────────────────────────────────
    async function handleUnlockCasting(songId: string, reason: string) {
        if (!reason.trim()) return;
        await supabase
            .from("show_group_songs")
            .update({
                casting_status: "unlocked",
                unlocked_by: currentUser?.staffId ?? null,
                unlocked_at: new Date().toISOString(),
                unlock_reason: reason.trim(),
            })
            .eq("id", songId);
        setUnlockPanelSongId(null);
        setUnlockReasonText("");
        // Reload songs
        if (selectedGroupId) {
            const { data } = await supabase
                .from("show_group_songs")
                .select("id, show_group_instance_id, title, artist, order_index, casting_status, has_method_lesson, unlocked_by, unlocked_at, unlock_reason")
                .eq("show_group_instance_id", selectedGroupId)
                .order("order_index");
            if (data) setShowGroupSongs(data as ShowGroupSong[]);
        }
    }

    // ── Reset to draft ────────────────────────────────────────────────────────
    async function handleResetToDraft(songId: string) {
        await supabase
            .from("show_group_songs")
            .update({
                casting_status: "draft",
                unlocked_by: null,
                unlocked_at: null,
                unlock_reason: null,
            })
            .eq("id", songId);
        if (selectedGroupId) {
            const { data } = await supabase
                .from("show_group_songs")
                .select("id, show_group_instance_id, title, artist, order_index, casting_status, has_method_lesson, unlocked_by, unlocked_at, unlock_reason")
                .eq("show_group_instance_id", selectedGroupId)
                .order("order_index");
            if (data) setShowGroupSongs(data as ShowGroupSong[]);
        }
    }

    // ── Derived data ──────────────────────────────────────────────────────────
    const enrolledStudents = memberships
        .map((m) => students.find((s) => s.id === m.student_id))
        .filter((s): s is StudentRow => s !== undefined);

    const priorGradeMap = new Map<string, number>();
    for (const rs of priorRehearsalSongs) {
        if (rs.readiness_grade) priorGradeMap.set(rs.show_group_song_id, rs.readiness_grade);
    }

    const presentCount = attendance.filter((a) => a.status === "present").length;
    const lateCount = attendance.filter((a) => a.status === "late").length;
    const absentCount = attendance.filter((a) => a.status === "absent").length;

    const canApprove = role === "music_director" || role === "general_manager" || role === "owner" || role === "instructor";
    const canManageCasting = role === "general_manager" || role === "music_director" || role === "owner";

    const pendingNominations = awards.filter((a) => a.award_type === "peer" && a.status === "pending");
    const approvedPeerAwards = awards.filter((a) => a.award_type === "peer" && a.status === "approved");

    // ── Song note local state ─────────────────────────────────────────────────
    // Track textarea values locally to avoid controlled-component issues
    function getSongNotes(songId: string): string {
        return rehearsalSongs.find((rs) => rs.show_group_song_id === songId)?.notes ?? "";
    }

    // ─── Early returns ────────────────────────────────────────────────────────

    if (loadingGroups) {
        return <div className="p-6 text-zinc-400 text-sm">Loading show groups...</div>;
    }

    if (showGroups.length === 0) {
        return (
            <div className="p-6">
                <div className="bg-[#111111] p-6">
                    <div className="text-zinc-400 text-sm">No active show groups found for {schoolName}.</div>
                    <div className="mt-2 text-xs text-zinc-500">Create show groups in the Show Groups tab first.</div>
                </div>
            </div>
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="p-6 space-y-6">

            {/* SECTION 1 — Show Group Selector */}
            <div>
                <div className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
                    Select Show Group
                </div>
                <div className="flex flex-wrap gap-3">
                    {showGroups.map((group) => {
                        const isSelected = selectedGroupId === group.id;
                        const dayLabel = group.day_of_week
                            ? (DAY_LABELS[group.day_of_week.toLowerCase()] ?? group.day_of_week) : null;
                        const timeStr = group.start_time ? formatTime(group.start_time) : null;
                        return (
                            <button key={group.id} type="button"
                                onClick={() => {
                                    setSelectedGroupId(group.id);
                                    setRehearsal(null);
                                    setAttendance([]);
                                    setRehearsalSongs([]);
                                    setAwards([]);
                                    const today = todayStr();
                                    const inWindow =
                                        (!group.start_date || today >= group.start_date) &&
                                        (!group.end_date || today <= group.end_date);
                                    setSelectedDate(inWindow ? today : (group.start_date ?? today));
                                }}
                                className={`text-left p-4 min-w-[200px] max-w-[280px] transition-colors ${
                                    isSelected
                                        ? "border-2 border-[#cc0000] bg-[#1a1a1a]"
                                        : "border border-zinc-700 bg-[#1a1a1a] hover:border-zinc-500"
                                }`}>
                                <div className="text-base font-bold text-white leading-tight"
                                    style={{ fontFamily: "var(--font-oswald)" }}>{group.name}</div>
                                {group.season_name && (
                                    <div className="mt-1">
                                        <span className="bg-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">
                                            {group.season_name}
                                        </span>
                                    </div>
                                )}
                                {(dayLabel || timeStr) && (
                                    <div className="mt-2 text-xs text-zinc-400">
                                        {[dayLabel, timeStr].filter(Boolean).join(" · ")}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SECTION 2 — Rehearsal Session */}
            {selectedGroup && (
                <div className="bg-[#111111] p-5 space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                                Rehearsal Date
                            </div>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                min={selectedGroup.start_date ?? undefined}
                                max={selectedGroup.end_date ?? undefined}
                                className="bg-[#1a1a1a] border border-zinc-700 text-white px-3 py-1.5 text-sm outline-none focus:border-[#cc0000]"
                            />
                            {selectedGroup.start_date && selectedGroup.end_date ? (
                                <div className="text-xs text-zinc-500 mt-1">
                                    Season: {new Date(selectedGroup.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – {new Date(selectedGroup.end_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </div>
                            ) : selectedGroup.start_date ? (
                                <div className="text-xs text-zinc-500 mt-1">
                                    Season starts: {new Date(selectedGroup.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </div>
                            ) : (
                                <div className="text-xs text-zinc-500 mt-1">No season dates set — edit in Show Groups</div>
                            )}
                        </div>
                        {rehearsal && (
                            <div className="flex-1 min-w-[200px]">
                                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                                    Session Notes
                                </div>
                                <textarea
                                    value={notesValue}
                                    onChange={(e) => setNotesValue(e.target.value)}
                                    onBlur={handleNotesBlur}
                                    placeholder="General rehearsal notes…"
                                    rows={2}
                                    className="w-full bg-[#1a1a1a] border border-zinc-700 text-white px-3 py-2 text-sm outline-none focus:border-[#cc0000] resize-none"
                                />
                            </div>
                        )}
                    </div>

                    {loadingRehearsal && (
                        <div className="text-sm text-zinc-400">Loading rehearsal data…</div>
                    )}

                    {!loadingRehearsal && !rehearsal && (
                        <div>
                            <div className="text-sm text-zinc-400 mb-3">
                                No rehearsal record for {selectedDate}.
                            </div>
                            <button
                                type="button"
                                onClick={handleStartRehearsal}
                                disabled={startingRehearsal}
                                className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000] disabled:opacity-50"
                            >
                                {startingRehearsal ? "Starting…" : "Start Rehearsal"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Sections 3–5 only show once a rehearsal is active */}
            {rehearsal && selectedGroup && (
                <>
                    {/* SECTION 3 — Attendance */}
                    <div className="bg-[#111111] p-5 space-y-3">
                        <div className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                            Attendance
                        </div>

                        {/* Summary */}
                        <div className="text-xs text-zinc-500">
                            {presentCount} present
                            {lateCount > 0 && ` · ${lateCount} late`}
                            {absentCount > 0 && ` · ${absentCount} absent`}
                        </div>

                        {enrolledStudents.length === 0 ? (
                            <div className="text-sm text-zinc-500">No enrolled students found.</div>
                        ) : (
                            <div className="grid gap-1.5">
                                {enrolledStudents.map((student) => {
                                    const att = attendance.find((a) => a.student_id === student.id);
                                    const status: AttendanceStatus = att?.status ?? "present";
                                    return (
                                        <div key={student.id}
                                            className="flex items-center gap-3 bg-[#1a1a1a] px-3 py-2">
                                            <span className={`flex-1 text-sm ${attendanceColor(status)}`}>
                                                {student.firstName}{student.lastInitial ? ` ${student.lastInitial}.` : ""}
                                            </span>
                                            <span className="bg-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">
                                                {student.instrument}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleAttendance(student.id)}
                                                className={`px-3 py-1 text-[11px] font-medium uppercase tracking-wide ${attendanceBg(status)}`}
                                            >
                                                {status}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* SECTION 4 — Song Priority */}
                    <div className="bg-[#111111] p-5 space-y-3">
                        <div className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                            Song Priority
                        </div>

                        {showGroupSongs.length === 0 ? (
                            <div className="text-sm text-zinc-500">No songs in this show group yet.</div>
                        ) : (
                            <div className="space-y-2">
                                {showGroupSongs.map((song) => {
                                    const rs = rehearsalSongs.find((r) => r.show_group_song_id === song.id);
                                    const isFocus = rs?.is_focus ?? false;
                                    const isNew = song.casting_status === "approved" && !rehearsedSongIds.has(song.id);
                                    const priorGrade = priorGradeMap.get(song.id);
                                    const currentGrade = rs?.readiness_grade ?? null;

                                    return (
                                        <div key={song.id}
                                            className={`bg-[#1a1a1a] p-3 border-l-2 ${isFocus ? "border-l-[#cc0000]" : "border-l-zinc-700"}`}>
                                            <div className="flex flex-wrap items-start gap-3">
                                                {/* Focus checkbox */}
                                                <label className="flex items-center gap-2 cursor-pointer mt-0.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={isFocus}
                                                        onChange={() => handleToggleFocus(song.id)}
                                                        className="w-4 h-4 accent-[#cc0000]"
                                                    />
                                                </label>

                                                {/* Song info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-sm font-medium text-white">
                                                            {song.title}
                                                        </span>
                                                        <span className="text-xs text-zinc-500">{song.artist}</span>
                                                        {isNew && (
                                                            <span className="bg-blue-900 text-blue-300 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                                                                NEW
                                                            </span>
                                                        )}
                                                        {priorGrade && GRADE_LABELS[priorGrade] && (
                                                            <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wide ${GRADE_LABELS[priorGrade].color}`}>
                                                                {GRADE_LABELS[priorGrade].label}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Priority order input when focused */}
                                                    {isFocus && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <span className="text-[11px] text-zinc-500">Priority:</span>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={4}
                                                                value={rs?.priority_order ?? ""}
                                                                onChange={(e) => handlePriorityChange(song.id, e.target.value)}
                                                                className="w-14 bg-[#111111] border border-zinc-700 text-white px-2 py-0.5 text-xs outline-none focus:border-[#cc0000]"
                                                                placeholder="1–4"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Notes */}
                                                    <div className="mt-2">
                                                        <textarea
                                                            defaultValue={getSongNotes(song.id)}
                                                            onBlur={(e) => handleSongNotesBlur(song.id, e.target.value)}
                                                            placeholder="Song notes…"
                                                            rows={1}
                                                            className="w-full bg-[#111111] border border-zinc-700 text-zinc-300 px-2 py-1 text-xs outline-none focus:border-[#cc0000] resize-none"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Grade selector */}
                                                <div className="flex gap-1 flex-wrap">
                                                    {[1, 2, 3, 4].map((g) => (
                                                        <button
                                                            key={g}
                                                            type="button"
                                                            onClick={() => handleGradeChange(song.id, g)}
                                                            className={`px-2 py-1 text-[10px] font-medium uppercase ${
                                                                currentGrade === g
                                                                    ? GRADE_LABELS[g].color
                                                                    : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                                                            }`}
                                                        >
                                                            {g}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* SECTION 5 — Awards */}
                    <div className="bg-[#111111] p-5 space-y-6">
                        <div className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                            Awards
                        </div>

                        {/* 5A — Instructor Awards */}
                        <div className="space-y-3">
                            <div className="text-[11px] uppercase tracking-widest text-zinc-500">
                                Instructor Awards
                            </div>
                            {enrolledStudents.length === 0 ? (
                                <div className="text-sm text-zinc-500">No enrolled students.</div>
                            ) : (
                                <div className="space-y-2">
                                    {enrolledStudents.map((student) => {
                                        const seasonCount = seasonAwardCounts[student.id] ?? 0;
                                        return (
                                            <div key={student.id} className="bg-[#1a1a1a] p-3">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <span className="text-sm text-white font-medium">
                                                        {student.firstName}{student.lastInitial ? ` ${student.lastInitial}.` : ""}
                                                    </span>
                                                    <span className="bg-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">
                                                        {student.instrument}
                                                    </span>
                                                    {seasonCount > 0 && (
                                                        <span className="text-[10px] text-zinc-500">
                                                            {seasonCount} season award{seasonCount !== 1 ? "s" : ""}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {behaviors.map((b) => {
                                                        const hasAward = awards.some(
                                                            (a) => a.student_id === student.id &&
                                                                   a.behavior_id === b.id &&
                                                                   a.award_type === "instructor" &&
                                                                   a.rehearsal_id === rehearsal.id
                                                        );
                                                        return (
                                                            <button
                                                                key={b.id}
                                                                type="button"
                                                                onClick={() => handleToggleInstructorAward(student.id, b.id)}
                                                                className={`px-3 py-1 text-[11px] font-medium uppercase tracking-wide border ${
                                                                    hasAward
                                                                        ? "bg-[#cc0000] border-[#cc0000] text-white"
                                                                        : "bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                                                }`}
                                                            >
                                                                {b.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 5B — Peer Nominations */}
                        <div className="space-y-3">
                            <div className="text-[11px] uppercase tracking-widest text-zinc-500">
                                Peer Nominations
                            </div>

                            {/* Submit form */}
                            <div className="bg-[#1a1a1a] p-4 space-y-3">
                                <div className="text-xs text-zinc-400 mb-1">Submit a nomination</div>
                                <div className="flex flex-wrap gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] uppercase tracking-wide text-zinc-500">Recognize</label>
                                        <select
                                            value={peerNomineeId}
                                            onChange={(e) => setPeerNomineeId(e.target.value)}
                                            className="bg-[#111111] border border-zinc-700 text-white px-3 py-1.5 text-sm outline-none focus:border-[#cc0000]"
                                        >
                                            <option value="">Select student…</option>
                                            {enrolledStudents.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.firstName}{s.lastInitial ? ` ${s.lastInitial}.` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] uppercase tracking-wide text-zinc-500">For</label>
                                        <select
                                            value={peerBehaviorId}
                                            onChange={(e) => setPeerBehaviorId(e.target.value)}
                                            className="bg-[#111111] border border-zinc-700 text-white px-3 py-1.5 text-sm outline-none focus:border-[#cc0000]"
                                        >
                                            <option value="">Select behavior…</option>
                                            {behaviors.map((b) => (
                                                <option key={b.id} value={b.id}>{b.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                                        <label className="text-[10px] uppercase tracking-wide text-zinc-500">Note (optional)</label>
                                        <input
                                            type="text"
                                            value={peerNote}
                                            onChange={(e) => setPeerNote(e.target.value)}
                                            placeholder="Optional note…"
                                            className="bg-[#111111] border border-zinc-700 text-white px-3 py-1.5 text-sm outline-none focus:border-[#cc0000]"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            type="button"
                                            onClick={handleSubmitPeerNomination}
                                            disabled={!peerNomineeId || !peerBehaviorId || submittingNomination}
                                            className="bg-[#cc0000] text-white px-4 py-1.5 text-sm font-medium hover:bg-[#b30000] disabled:opacity-40"
                                        >
                                            Submit
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Pending approvals */}
                            {canApprove && pendingNominations.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                                        Pending Approvals
                                    </div>
                                    {pendingNominations.map((award) => {
                                        const nominee = students.find((s) => s.id === award.student_id);
                                        const behavior = behaviors.find((b) => b.id === award.behavior_id);
                                        const nominator = award.nominated_by_student_id
                                            ? students.find((s) => s.id === award.nominated_by_student_id)
                                            : null;
                                        return (
                                            <div key={award.id} className="bg-[#1a1a1a] px-4 py-3 flex flex-wrap items-center gap-3">
                                                <div className="flex-1 text-sm text-zinc-300">
                                                    {nominator
                                                        ? `${nominator.firstName} nominated `
                                                        : "Nomination for "}
                                                    <span className="text-white font-medium">
                                                        {nominee?.firstName}{nominee?.lastInitial ? ` ${nominee.lastInitial}.` : ""}
                                                    </span>
                                                    {" for "}
                                                    <span className="text-white font-medium">{behavior?.label}</span>
                                                    {award.notes && (
                                                        <span className="text-zinc-500"> — {award.notes}</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAwardStatus(award.id, "approved")}
                                                        className="bg-green-800 text-green-300 px-3 py-1 text-xs font-medium hover:bg-green-700"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAwardStatus(award.id, "rejected")}
                                                        className="bg-zinc-700 text-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-600"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Approved peer awards feed */}
                            {approvedPeerAwards.length > 0 && (
                                <div className="space-y-1.5">
                                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                                        Peer Recognition This Session
                                    </div>
                                    {approvedPeerAwards.map((award) => {
                                        const nominee = students.find((s) => s.id === award.student_id);
                                        const behavior = behaviors.find((b) => b.id === award.behavior_id);
                                        return (
                                            <div key={award.id}
                                                className="bg-[#1a1a1a] border-l-2 border-l-[#cc0000] px-4 py-2 text-sm text-zinc-300">
                                                🎉{" "}
                                                <span className="text-white font-medium">
                                                    {nominee?.firstName}{nominee?.lastInitial ? ` ${nominee.lastInitial}.` : ""}
                                                </span>
                                                {" received "}
                                                <span className="text-white font-medium">{behavior?.label}</span>
                                                {" recognition"}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                </>
            )}

            {/* SECTION 6 — Casting Lock/Unlock (management only) */}
            {selectedGroup && canManageCasting && (
                <div className="bg-[#111111] p-5 space-y-3">
                    <div className="text-xs font-medium uppercase tracking-widest text-zinc-400"
                        style={{ fontFamily: "var(--font-oswald)" }}>
                        Casting Status
                    </div>

                    {showGroupSongs.length === 0 ? (
                        <div className="text-sm text-zinc-500">No songs in this show group yet.</div>
                    ) : (
                        <div className="space-y-2">
                            {showGroupSongs.map((song) => {
                                const isUnlockPanelOpen = unlockPanelSongId === song.id;

                                return (
                                    <div key={song.id} className="bg-[#1a1a1a]">
                                        <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                                            {/* Song info */}
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm text-white font-medium">
                                                    {song.title}
                                                </span>
                                                <span className="ml-2 text-xs text-zinc-500">
                                                    {song.artist}
                                                </span>
                                            </div>

                                            {/* Status + actions */}
                                            {song.casting_status === "approved" && (
                                                <>
                                                    <span className="bg-zinc-700 text-zinc-300 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                                                        🔒 LOCKED
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setUnlockPanelSongId(isUnlockPanelOpen ? null : song.id);
                                                            setUnlockReasonText("");
                                                        }}
                                                        className="border border-amber-400 text-amber-400 px-2 py-0.5 text-[11px] font-medium hover:bg-amber-400/10"
                                                    >
                                                        Unlock
                                                    </button>
                                                </>
                                            )}

                                            {song.casting_status === "unlocked" && (
                                                <>
                                                    <span className="bg-amber-900 text-amber-300 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                                                        ⚠ UNLOCKED
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleResetToDraft(song.id)}
                                                        className="border border-zinc-600 text-zinc-400 px-2 py-0.5 text-[11px] font-medium hover:bg-zinc-700"
                                                    >
                                                        Reset to Draft
                                                    </button>
                                                </>
                                            )}

                                            {song.casting_status !== "approved" && song.casting_status !== "unlocked" && (
                                                <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                                                    song.casting_status === "submitted"
                                                        ? "bg-amber-700 text-amber-200"
                                                        : song.casting_status === "returned"
                                                        ? "bg-[#cc0000] text-white"
                                                        : "bg-zinc-700 text-zinc-400"
                                                }`}>
                                                    {song.casting_status}
                                                </span>
                                            )}
                                        </div>

                                        {/* Unlock reason display (unlocked state) */}
                                        {song.casting_status === "unlocked" && song.unlock_reason && (
                                            <div className="px-3 pb-2.5 text-xs italic text-zinc-400">
                                                {song.unlock_reason}
                                            </div>
                                        )}

                                        {/* Inline unlock confirmation panel */}
                                        {isUnlockPanelOpen && (
                                            <div className="border-t border-zinc-700 px-3 py-3 space-y-3 bg-[#111111]">
                                                <p className="text-xs text-zinc-400 leading-relaxed">
                                                    Unlocking approved casting requires a reason and will trigger re-approval.
                                                    Students may be notified if assignments change.
                                                </p>
                                                <textarea
                                                    value={unlockReasonText}
                                                    onChange={(e) => setUnlockReasonText(e.target.value)}
                                                    placeholder="Reason for unlocking..."
                                                    rows={2}
                                                    className="w-full bg-[#1a1a1a] border border-zinc-700 text-white px-3 py-2 text-sm outline-none focus:border-amber-400 resize-none"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setUnlockPanelSongId(null);
                                                            setUnlockReasonText("");
                                                        }}
                                                        className="border border-zinc-600 text-zinc-400 px-3 py-1 text-xs font-medium hover:bg-zinc-700"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnlockCasting(song.id, unlockReasonText)}
                                                        disabled={!unlockReasonText.trim()}
                                                        className="bg-amber-700 text-amber-100 px-3 py-1 text-xs font-medium hover:bg-amber-600 disabled:opacity-40"
                                                    >
                                                        Unlock Casting
                                                    </button>
                                                </div>
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
    );
}
