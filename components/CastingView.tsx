"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SessionUser } from "@/lib/session";

// ─── Types ─────────────────────────────────────────────────────────────────

type ShowGroup = {
    id: string;
    name: string;
    school_id: string;
    season_id: string | null;
    show_theme_id: string | null;
    theme_type_id: string | null;
    status: string;
    day_of_week: string | null;
    start_time: string | null;
    end_time: string | null;
    class_instructor_id: string | null;
    season_name?: string | null;
};

type Song = {
    id: string;
    show_group_instance_id: string;
    title: string;
    artist: string;
    order_index: number;
    casting_status: string;
    pair_group: number | null;
    rehearsal_room_id: string | null;
    has_method_lesson: boolean;
    song_key: string | null;
    tuning: string | null;
    notes: string | null;
};

type CastSlot = {
    id: string;
    show_group_song_id: string;
    cast_slot_type_id: string;
    slot_label: string;
    max_students: number;
    order_index: number;
    type_name?: string;
};

type CastSlotType = {
    id: string;
    name: string;
    slot_category: string;
};

type RehearsalRoom = {
    id: string;
    school_id: string;
    name: string;
    order_index: number;
};

type ThemeSong = {
    id: string;
    show_theme_id: string;
    title: string;
    artist: string;
    has_method_lesson: boolean;
    order_index: number;
};

type Membership = {
    id: string;
    student_id: string;
    status: string;
};

type CastAssignment = {
    id: string;
    show_song_cast_slot_id: string;
    student_id: string;
    status: string;
    is_conflict_override: boolean;
    override_reason: string | null;
    override_approved_by: string | null;
    song_id: string; // derived from slot → song lookup
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

type OverrideModal = {
    slotId: string;
    studentId: string;
    conflictSongTitle: string;
};

type CastingViewProps = {
    currentUser: SessionUser | null;
    schoolId: string;
    schoolName: string;
    students: StudentRow[];
};

// ─── Constants ─────────────────────────────────────────────────────────────

const PAIR_COLORS = [
    "#3b82f6", // blue
    "#a855f7", // purple
    "#f59e0b", // amber
    "#10b981", // emerald
    "#f97316", // orange
    "#ec4899", // pink
];

const DAY_LABELS: Record<string, string> = {
    monday: "Mon", tuesday: "Tue", wednesday: "Wed",
    thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const SONG_SELECT_COLS =
    "id, show_group_instance_id, title, artist, order_index, casting_status, pair_group, rehearsal_room_id, has_method_lesson, song_key, tuning, notes";

// ─── Helpers ───────────────────────────────────────────────────────────────

function getPairColor(pairGroup: number): string {
    return PAIR_COLORS[(pairGroup - 1) % PAIR_COLORS.length];
}

function formatTime(t: string | null): string {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function castingStatusStyle(status: string): { bg: string; label: string } {
    switch (status) {
        case "submitted": return { bg: "bg-amber-700", label: "SUBMITTED" };
        case "approved":  return { bg: "bg-green-700", label: "APPROVED" };
        case "returned":  return { bg: "bg-[#cc0000]", label: "RETURNED" };
        default:          return { bg: "bg-zinc-700", label: "DRAFT" };
    }
}

function sortSongsForDisplay(songs: Song[], rooms: RehearsalRoom[]): Song[] {
    const roomOrderMap: Record<string, number> = {};
    for (const r of rooms) roomOrderMap[r.id] = r.order_index;

    const paired = songs.filter((s) => s.pair_group !== null);
    const unpaired = songs.filter((s) => s.pair_group === null);

    paired.sort((a, b) => {
        if ((a.pair_group ?? 0) !== (b.pair_group ?? 0)) {
            return (a.pair_group ?? 0) - (b.pair_group ?? 0);
        }
        const aRoom = a.rehearsal_room_id != null ? (roomOrderMap[a.rehearsal_room_id] ?? 99) : 99;
        const bRoom = b.rehearsal_room_id != null ? (roomOrderMap[b.rehearsal_room_id] ?? 99) : 99;
        return aRoom - bRoom;
    });

    unpaired.sort((a, b) => a.order_index - b.order_index);
    return [...paired, ...unpaired];
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function CastingView({ currentUser, schoolId, schoolName, students }: CastingViewProps) {
    const role = currentUser?.role ?? "";
    const canApprove = role === "music_director" || role === "general_manager" || role === "owner";

    // Show group selector
    const [showGroups, setShowGroups] = useState<ShowGroup[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    // Song / room data
    const [songs, setSongs] = useState<Song[]>([]);
    const [loadingSongs, setLoadingSongs] = useState(false);
    const [rooms, setRooms] = useState<RehearsalRoom[]>([]);
    const [castSlotTypes, setCastSlotTypes] = useState<CastSlotType[]>([]);

    // Memberships + assignments (loaded per group)
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [castAssignments, setCastAssignments] = useState<CastAssignment[]>([]);

    // Slot editor
    const [expandedSlotSongId, setExpandedSlotSongId] = useState<string | null>(null);
    const [expandedSlots, setExpandedSlots] = useState<CastSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [addSlotTypeId, setAddSlotTypeId] = useState("");
    const [addSlotLabel, setAddSlotLabel] = useState("");
    const [addSlotMax, setAddSlotMax] = useState(1);

    // Remove song confirmation
    const [removingSongId, setRemovingSongId] = useState<string | null>(null);

    // Add songs panel
    const [addSongsOpen, setAddSongsOpen] = useState(false);
    const [themeSongs, setThemeSongs] = useState<ThemeSong[]>([]);
    const [checkedThemeSongIds, setCheckedThemeSongIds] = useState<Set<string>>(new Set());
    const [addingSongs, setAddingSongs] = useState(false);
    const [customTitle, setCustomTitle] = useState("");
    const [customArtist, setCustomArtist] = useState("");
    const [customHasMethodLesson, setCustomHasMethodLesson] = useState(false);

    // Conflict override modal
    const [overrideModal, setOverrideModal] = useState<OverrideModal | null>(null);

    // Equity panel
    const [equityOpen, setEquityOpen] = useState(false);

    // Submit workflow
    const [submitOpen, setSubmitOpen] = useState(false);
    const [submitCheckedSongIds, setSubmitCheckedSongIds] = useState<Set<string>>(new Set());

    // MD return-with-notes
    const [returningNotesSongId, setReturningNotesSongId] = useState<string | null>(null);
    const [returnNotesText, setReturnNotesText] = useState("");

    const selectedGroup = showGroups.find((g) => g.id === selectedGroupId) ?? null;

    // ─── Data loading ───────────────────────────────────────────────────────

    useEffect(() => {
        if (!schoolId) return;
        console.log("CastingView: loading show groups for schoolId:", schoolId);
        setLoadingGroups(true);
        supabase
            .from("show_group_instances")
            .select("*, seasons(name)")
            .eq("school_id", schoolId)
            .eq("status", "active")
            .order("name")
            .then(({ data, error }) => {
                if (error) {
                    console.error("CastingView: show groups query error", error, "schoolId:", schoolId);
                }
                if (data) {
                    setShowGroups(
                        data.map((row: any) => ({
                            id: row.id,
                            name: row.name,
                            school_id: row.school_id,
                            season_id: row.season_id,
                            show_theme_id: row.show_theme_id,
                            theme_type_id: row.theme_type_id,
                            status: row.status,
                            day_of_week: row.day_of_week,
                            start_time: row.start_time,
                            end_time: row.end_time,
                            class_instructor_id: row.class_instructor_id,
                            season_name: row.seasons?.name ?? null,
                        }))
                    );
                }
                setLoadingGroups(false);
            });
    }, [schoolId]);

    useEffect(() => {
        supabase
            .from("cast_slot_types")
            .select("id, name, slot_category")
            .order("name")
            .then(({ data }) => {
                if (data) setCastSlotTypes(data as CastSlotType[]);
            });
    }, []);

    const loadCastAssignments = useCallback(async (songIds: string[]) => {
        if (songIds.length === 0) { setCastAssignments([]); return; }

        const { data: allSlots } = await supabase
            .from("show_song_cast_slots")
            .select("id, show_group_song_id")
            .in("show_group_song_id", songIds);

        if (!allSlots || allSlots.length === 0) { setCastAssignments([]); return; }

        const slotToSongMap: Record<string, string> = {};
        for (const s of allSlots as any[]) slotToSongMap[s.id] = s.show_group_song_id;

        const slotIds = Object.keys(slotToSongMap);
        const { data: assignments } = await supabase
            .from("show_song_cast_assignments")
            .select("id, show_song_cast_slot_id, student_id, status, is_conflict_override, override_reason, override_approved_by")
            .in("show_song_cast_slot_id", slotIds);

        setCastAssignments(
            (assignments ?? []).map((a: any) => ({
                id: a.id,
                show_song_cast_slot_id: a.show_song_cast_slot_id,
                student_id: a.student_id,
                status: a.status,
                is_conflict_override: a.is_conflict_override ?? false,
                override_reason: a.override_reason ?? null,
                override_approved_by: a.override_approved_by ?? null,
                song_id: slotToSongMap[a.show_song_cast_slot_id] ?? "",
            }))
        );
    }, []);

    useEffect(() => {
        if (!selectedGroupId) {
            setSongs([]); setRooms([]); setMemberships([]);
            setCastAssignments([]); setExpandedSlotSongId(null);
            setExpandedSlots([]); setAddSongsOpen(false);
            setRemovingSongId(null); setEquityOpen(false);
            setSubmitOpen(false); setReturningNotesSongId(null);
            return;
        }
        async function load() {
            setLoadingSongs(true);
            const [songsRes, roomsRes, membershipsRes] = await Promise.all([
                supabase.from("show_group_songs").select(SONG_SELECT_COLS)
                    .eq("show_group_instance_id", selectedGroupId)
                    .order("order_index", { ascending: true }),
                supabase.from("rehearsal_rooms").select("id, school_id, name, order_index")
                    .eq("school_id", schoolId).order("order_index", { ascending: true }),
                supabase.from("show_group_student_memberships")
                    .select("id, student_id, status")
                    .eq("show_group_instance_id", selectedGroupId)
                    .eq("status", "active"),
            ]);
            const songData = (songsRes.data ?? []) as Song[];
            if (!songsRes.error) setSongs(songData);
            if (!roomsRes.error && roomsRes.data) setRooms(roomsRes.data as RehearsalRoom[]);
            if (!membershipsRes.error && membershipsRes.data)
                setMemberships(membershipsRes.data as Membership[]);
            await loadCastAssignments(songData.map((s) => s.id));
            setLoadingSongs(false);
        }
        load();
    }, [selectedGroupId, schoolId, loadCastAssignments]);

    const loadSlots = useCallback(async (songId: string) => {
        setLoadingSlots(true);
        const { data, error } = await supabase
            .from("show_song_cast_slots")
            .select("id, show_group_song_id, cast_slot_type_id, slot_label, max_students, order_index, cast_slot_types(name)")
            .eq("show_group_song_id", songId)
            .order("order_index", { ascending: true });
        if (!error && data) {
            setExpandedSlots(
                data.map((row: any) => ({
                    id: row.id,
                    show_group_song_id: row.show_group_song_id,
                    cast_slot_type_id: row.cast_slot_type_id,
                    slot_label: row.slot_label,
                    max_students: row.max_students,
                    order_index: row.order_index,
                    type_name: row.cast_slot_types?.name ?? "",
                }))
            );
        }
        setLoadingSlots(false);
    }, []);

    useEffect(() => {
        if (!addSongsOpen || !selectedGroup?.show_theme_id) {
            setThemeSongs([]); setCheckedThemeSongIds(new Set()); return;
        }
        supabase
            .from("theme_songs")
            .select("id, show_theme_id, title, artist, has_method_lesson, order_index")
            .eq("show_theme_id", selectedGroup.show_theme_id)
            .order("has_method_lesson", { ascending: false })
            .order("order_index", { ascending: true })
            .then(({ data }) => { if (data) setThemeSongs(data as ThemeSong[]); });
    }, [addSongsOpen, selectedGroup?.show_theme_id]);

    // ─── Derived state ──────────────────────────────────────────────────────

    const sortedSongs = useMemo(
        () => sortSongsForDisplay(songs, rooms),
        [songs, rooms]
    );

    const sortedPairGroups = useMemo(() => {
        return [...new Set(
            songs.filter((s) => s.pair_group !== null).map((s) => s.pair_group as number)
        )].sort((a, b) => a - b);
    }, [songs]);

    const enrolledStudents = useMemo(() => {
        return memberships
            .map((m) => students.find((s) => s.id === m.student_id))
            .filter(Boolean) as StudentRow[];
    }, [memberships, students]);

    const equityData = useMemo(() => {
        return enrolledStudents
            .map((student) => ({
                student,
                count: castAssignments.filter((a) => a.student_id === student.id).length,
            }))
            .sort((a, b) => b.count - a.count);
    }, [enrolledStudents, castAssignments]);

    const equityStats = useMemo(() => {
        if (equityData.length === 0) return { avg: 0, min: 0, max: 0 };
        const counts = equityData.map((d) => d.count);
        const avg = counts.reduce((s, c) => s + c, 0) / counts.length;
        return { avg, min: Math.min(...counts), max: Math.max(...counts) };
    }, [equityData]);

    const summaryCounts = useMemo(() =>
        songs.reduce((acc, s) => {
            acc[s.casting_status] = (acc[s.casting_status] ?? 0) + 1; return acc;
        }, {} as Record<string, number>),
        [songs]
    );

    // ─── Conflict helpers ───────────────────────────────────────────────────

    function getConflictedStudentIds(currentSong: Song): Map<string, string> {
        // Returns Map<studentId, conflictSongTitle>
        const result = new Map<string, string>();
        if (!currentSong.pair_group) return result;
        const pairedSongs = songs.filter(
            (s) => s.pair_group === currentSong.pair_group && s.id !== currentSong.id
        );
        for (const ps of pairedSongs) {
            for (const a of castAssignments) {
                if (a.song_id === ps.id && !result.has(a.student_id)) {
                    result.set(a.student_id, ps.title);
                }
            }
        }
        return result;
    }

    function getStudentDisplayName(student: StudentRow): string {
        return `${student.firstName} ${student.lastInitial}.`;
    }

    // ─── Song management handlers ───────────────────────────────────────────

    function handleToggleSlots(songId: string) {
        if (expandedSlotSongId === songId) {
            setExpandedSlotSongId(null); setExpandedSlots([]);
            setAddSlotTypeId(""); setAddSlotLabel(""); setAddSlotMax(1);
        } else {
            setExpandedSlotSongId(songId); setExpandedSlots([]);
            setAddSlotTypeId(""); setAddSlotLabel(""); setAddSlotMax(1);
            loadSlots(songId);
        }
    }

    async function handleReorderPair(pairGroup: number, direction: "up" | "down") {
        const idx = sortedPairGroups.indexOf(pairGroup);
        if (direction === "up" && idx <= 0) return;
        if (direction === "down" && idx >= sortedPairGroups.length - 1) return;
        const otherPairGroup = direction === "up"
            ? sortedPairGroups[idx - 1]
            : sortedPairGroups[idx + 1];
        const updates = [
            ...songs.filter((s) => s.pair_group === pairGroup).map((s) =>
                supabase.from("show_group_songs").update({ pair_group: otherPairGroup }).eq("id", s.id)
            ),
            ...songs.filter((s) => s.pair_group === otherPairGroup).map((s) =>
                supabase.from("show_group_songs").update({ pair_group: pairGroup }).eq("id", s.id)
            ),
        ];
        await Promise.all(updates);
        setSongs((prev) => prev.map((s) => {
            if (s.pair_group === pairGroup) return { ...s, pair_group: otherPairGroup };
            if (s.pair_group === otherPairGroup) return { ...s, pair_group: pairGroup };
            return s;
        }));
    }

    async function handleReorderUnpaired(songId: string, direction: "up" | "down") {
        const unpairedSorted = songs
            .filter((s) => s.pair_group === null)
            .sort((a, b) => a.order_index - b.order_index);
        const idx = unpairedSorted.findIndex((s) => s.id === songId);
        if (direction === "up" && idx <= 0) return;
        if (direction === "down" && idx >= unpairedSorted.length - 1) return;
        const other = unpairedSorted[direction === "up" ? idx - 1 : idx + 1];
        const song = unpairedSorted[idx];
        await Promise.all([
            supabase.from("show_group_songs").update({ order_index: other.order_index }).eq("id", song.id),
            supabase.from("show_group_songs").update({ order_index: song.order_index }).eq("id", other.id),
        ]);
        setSongs((prev) => prev.map((s) => {
            if (s.id === song.id) return { ...s, order_index: other.order_index };
            if (s.id === other.id) return { ...s, order_index: song.order_index };
            return s;
        }));
    }

    async function handleRoomChange(songId: string, roomId: string) {
        const val = roomId === "" ? null : roomId;
        const { error } = await supabase.from("show_group_songs")
            .update({ rehearsal_room_id: val }).eq("id", songId);
        if (!error) setSongs((prev) => prev.map((s) => s.id === songId ? { ...s, rehearsal_room_id: val } : s));
    }

    async function handlePairGroupChange(songId: string, value: string) {
        const val = value === "" ? null : parseInt(value, 10);
        if (val !== null && (isNaN(val) || val < 1 || val > 20)) return;
        const { error } = await supabase.from("show_group_songs")
            .update({ pair_group: val }).eq("id", songId);
        if (!error) setSongs((prev) => prev.map((s) => s.id === songId ? { ...s, pair_group: val } : s));
    }

    async function handleRemoveSong(songId: string) {
        const { error } = await supabase.from("show_group_songs").delete().eq("id", songId);
        if (!error) {
            const remaining = songs.filter((s) => s.id !== songId);
            setSongs(remaining);
            if (expandedSlotSongId === songId) { setExpandedSlotSongId(null); setExpandedSlots([]); }
            setRemovingSongId(null);
            await loadCastAssignments(remaining.map((s) => s.id));
        }
    }

    // ─── Slot management ────────────────────────────────────────────────────

    async function handleAddSlot() {
        if (!expandedSlotSongId || !addSlotTypeId || !addSlotLabel.trim()) return;
        const nextOrder = expandedSlots.length > 0
            ? Math.max(...expandedSlots.map((s) => s.order_index)) + 1 : 1;
        const { error } = await supabase.from("show_song_cast_slots").insert({
            show_group_song_id: expandedSlotSongId,
            cast_slot_type_id: addSlotTypeId,
            slot_label: addSlotLabel.trim(),
            max_students: addSlotMax,
            order_index: nextOrder,
        });
        if (!error) {
            setAddSlotTypeId(""); setAddSlotLabel(""); setAddSlotMax(1);
            loadSlots(expandedSlotSongId);
        }
    }

    async function handleRemoveSlot(slotId: string) {
        const { error } = await supabase.from("show_song_cast_slots").delete().eq("id", slotId);
        if (!error && expandedSlotSongId) loadSlots(expandedSlotSongId);
    }

    // ─── Assignment handlers ─────────────────────────────────────────────────

    async function handleAssignStudent(slotId: string, studentId: string) {
        const { error } = await supabase.from("show_song_cast_assignments").insert({
            show_song_cast_slot_id: slotId,
            student_id: studentId,
            status: "active",
            is_conflict_override: false,
        });
        if (!error) await loadCastAssignments(songs.map((s) => s.id));
    }

    async function handleRemoveAssignment(assignmentId: string) {
        const { error } = await supabase.from("show_song_cast_assignments").delete().eq("id", assignmentId);
        if (!error) await loadCastAssignments(songs.map((s) => s.id));
    }

    async function handleConfirmOverride() {
        if (!overrideModal) return;
        const { error } = await supabase.from("show_song_cast_assignments").insert({
            show_song_cast_slot_id: overrideModal.slotId,
            student_id: overrideModal.studentId,
            status: "active",
            is_conflict_override: true,
        });
        if (!error) {
            setOverrideModal(null);
            await loadCastAssignments(songs.map((s) => s.id));
        }
    }

    // ─── Add songs handlers ─────────────────────────────────────────────────

    async function handleAddThemeSongs() {
        if (!selectedGroupId || checkedThemeSongIds.size === 0) return;
        setAddingSongs(true);
        let nextOrder = songs.length > 0 ? Math.max(...songs.map((s) => s.order_index)) + 1 : 1;
        for (const theme of themeSongs.filter((t) => checkedThemeSongIds.has(t.id))) {
            const { data: newSong, error: songError } = await supabase.from("show_group_songs")
                .insert({
                    show_group_instance_id: selectedGroupId,
                    title: theme.title, artist: theme.artist,
                    has_method_lesson: theme.has_method_lesson,
                    order_index: nextOrder, casting_status: "draft",
                }).select("id").single();
            if (songError || !newSong) { nextOrder++; continue; }
            const { data: templates } = await supabase.from("theme_song_cast_slots")
                .select("cast_slot_type_id, slot_label, max_students, order_index")
                .eq("theme_song_id", theme.id).order("order_index", { ascending: true });
            if (templates && templates.length > 0) {
                await supabase.from("show_song_cast_slots").insert(
                    templates.map((t: any) => ({
                        show_group_song_id: newSong.id,
                        cast_slot_type_id: t.cast_slot_type_id,
                        slot_label: t.slot_label,
                        max_students: t.max_students,
                        order_index: t.order_index,
                    }))
                );
            }
            nextOrder++;
        }
        const { data: refreshed } = await supabase.from("show_group_songs")
            .select(SONG_SELECT_COLS).eq("show_group_instance_id", selectedGroupId)
            .order("order_index", { ascending: true });
        if (refreshed) {
            setSongs(refreshed as Song[]);
            await loadCastAssignments((refreshed as Song[]).map((s) => s.id));
        }
        setAddingSongs(false); setAddSongsOpen(false); setCheckedThemeSongIds(new Set());
    }

    async function handleAddCustomSong() {
        if (!selectedGroupId || !customTitle.trim() || !customArtist.trim()) return;
        const nextOrder = songs.length > 0 ? Math.max(...songs.map((s) => s.order_index)) + 1 : 1;
        const { data: newSong, error } = await supabase.from("show_group_songs")
            .insert({
                show_group_instance_id: selectedGroupId,
                title: customTitle.trim(), artist: customArtist.trim(),
                has_method_lesson: customHasMethodLesson,
                order_index: nextOrder, casting_status: "draft",
            }).select(SONG_SELECT_COLS).single();
        if (!error && newSong) {
            const updated = [...songs, newSong as Song];
            setSongs(updated);
            await loadCastAssignments(updated.map((s) => s.id));
            setCustomTitle(""); setCustomArtist(""); setCustomHasMethodLesson(false);
        }
    }

    // ─── Submit / approval handlers ──────────────────────────────────────────

    function handleOpenSubmit() {
        setSubmitCheckedSongIds(new Set(songs.filter((s) => s.casting_status === "draft").map((s) => s.id)));
        setSubmitOpen(true);
    }

    async function handleSubmitCasting() {
        const ids = [...submitCheckedSongIds];
        if (ids.length === 0) return;
        for (const id of ids) {
            await supabase.from("show_group_songs").update({ casting_status: "submitted" }).eq("id", id);
        }
        setSongs((prev) => prev.map((s) =>
            submitCheckedSongIds.has(s.id) ? { ...s, casting_status: "submitted" } : s
        ));
        setSubmitOpen(false); setSubmitCheckedSongIds(new Set());
    }

    async function handleApproveSong(songId: string) {
        const { error } = await supabase.from("show_group_songs")
            .update({ casting_status: "approved" }).eq("id", songId);
        if (!error) setSongs((prev) => prev.map((s) =>
            s.id === songId ? { ...s, casting_status: "approved" } : s
        ));
    }

    async function handleReturnSong(songId: string) {
        const { error } = await supabase.from("show_group_songs")
            .update({ casting_status: "returned", notes: returnNotesText.trim() || null })
            .eq("id", songId);
        if (!error) {
            setSongs((prev) => prev.map((s) =>
                s.id === songId ? { ...s, casting_status: "returned", notes: returnNotesText.trim() || null } : s
            ));
            setReturningNotesSongId(null); setReturnNotesText("");
        }
    }

    // ─── Render helpers ─────────────────────────────────────────────────────

    function renderSlotEditor(song: Song) {
        const conflictMap = getConflictedStudentIds(song);

        return (
            <div className="border-l-2 border-b border-r border-zinc-800 bg-[#111111] p-4"
                style={{ borderLeftColor: "#cc0000" }}>
                {loadingSlots ? (
                    <div className="text-xs text-zinc-500">Loading slots...</div>
                ) : (
                    <>
                        {expandedSlots.length === 0 ? (
                            <div className="text-xs text-zinc-500 mb-3">No cast slots yet.</div>
                        ) : (
                            <div className="space-y-2 mb-4">
                                {expandedSlots.map((slot) => {
                                    const slotAssignments = castAssignments.filter(
                                        (a) => a.show_song_cast_slot_id === slot.id
                                    );
                                    const canAddMore = slotAssignments.length < slot.max_students;

                                    return (
                                        <div key={slot.id} className="bg-zinc-900 p-3">
                                            {/* Slot header */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm font-medium text-white flex-1">
                                                    {slot.slot_label}
                                                </span>
                                                {slot.type_name && (
                                                    <span className="bg-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">
                                                        {slot.type_name}
                                                    </span>
                                                )}
                                                <span className="text-xs text-zinc-500">
                                                    max {slot.max_students}
                                                </span>
                                                <button type="button" onClick={() => handleRemoveSlot(slot.id)}
                                                    className="text-sm text-[#cc0000] hover:text-white ml-1 leading-none"
                                                    title="Remove slot">×</button>
                                            </div>

                                            {/* Existing assignments */}
                                            {slotAssignments.map((assignment) => {
                                                const student = students.find((s) => s.id === assignment.student_id);
                                                return (
                                                    <div key={assignment.id}
                                                        className="flex items-center gap-2 pl-2 py-1 border-l border-zinc-700 mb-1">
                                                        <span className="text-sm text-white flex-1">
                                                            {student ? getStudentDisplayName(student) : "Unknown student"}
                                                        </span>
                                                        {student && (
                                                            <span className="bg-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                                                                {student.instrument}
                                                            </span>
                                                        )}
                                                        {assignment.is_conflict_override && (
                                                            <span className="bg-orange-900 text-orange-300 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                                                                CONFLICT OVERRIDE
                                                            </span>
                                                        )}
                                                        <button type="button"
                                                            onClick={() => handleRemoveAssignment(assignment.id)}
                                                            className="text-xs text-zinc-500 hover:text-[#cc0000]">
                                                            × Remove
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                            {/* Assign dropdown (if slot not full) */}
                                            {canAddMore && enrolledStudents.length > 0 && (() => {
                                                const alreadyAssignedIds = new Set(
                                                    slotAssignments.map((a) => a.student_id)
                                                );
                                                const matchInstrument = (slot.type_name ?? "").toLowerCase();
                                                const available = enrolledStudents.filter(
                                                    (s) => !alreadyAssignedIds.has(s.id) && !conflictMap.has(s.id)
                                                );
                                                const matched = available.filter(
                                                    (s) => s.instrument.toLowerCase() === matchInstrument
                                                );
                                                const others = available.filter(
                                                    (s) => s.instrument.toLowerCase() !== matchInstrument
                                                );
                                                const conflicted = enrolledStudents.filter(
                                                    (s) => !alreadyAssignedIds.has(s.id) && conflictMap.has(s.id)
                                                );

                                                return (
                                                    <div className="mt-2 flex flex-wrap gap-2 items-center pl-2">
                                                        <select
                                                            defaultValue=""
                                                            onChange={(e) => {
                                                                if (e.target.value)
                                                                    handleAssignStudent(slot.id, e.target.value);
                                                                e.target.value = "";
                                                            }}
                                                            className="bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 outline-none"
                                                        >
                                                            <option value="">Assign student...</option>
                                                            {matched.map((s) => (
                                                                <option key={s.id} value={s.id}>
                                                                    ● {getStudentDisplayName(s)} ({s.instrument})
                                                                </option>
                                                            ))}
                                                            {matched.length > 0 && others.length > 0 && (
                                                                <option disabled>──────────</option>
                                                            )}
                                                            {others.map((s) => (
                                                                <option key={s.id} value={s.id}>
                                                                    {getStudentDisplayName(s)} ({s.instrument})
                                                                </option>
                                                            ))}
                                                            {conflicted.length > 0 && (
                                                                <option disabled>── Room conflicts ──</option>
                                                            )}
                                                            {conflicted.map((s) => (
                                                                <option key={s.id} value={s.id} disabled>
                                                                    ⚠ {getStudentDisplayName(s)} — room conflict with {conflictMap.get(s.id)}
                                                                </option>
                                                            ))}
                                                        </select>

                                                        {/* Override buttons for conflicted students */}
                                                        {conflicted.map((s) => (
                                                            <button key={s.id} type="button"
                                                                onClick={() => setOverrideModal({
                                                                    slotId: slot.id,
                                                                    studentId: s.id,
                                                                    conflictSongTitle: conflictMap.get(s.id) ?? "",
                                                                })}
                                                                className="text-xs border border-orange-700 text-orange-400 hover:bg-orange-900 px-2 py-1">
                                                                Override {s.firstName}
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Add Slot form */}
                        <div className="border-t border-zinc-800 pt-3">
                            <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">Add Slot</div>
                            <div className="flex flex-wrap gap-2 items-end">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Cast Type</label>
                                    <select value={addSlotTypeId}
                                        onChange={(e) => {
                                            const typeId = e.target.value;
                                            setAddSlotTypeId(typeId);
                                            setAddSlotLabel(castSlotTypes.find((t) => t.id === typeId)?.name ?? "");
                                        }}
                                        className="bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 outline-none">
                                        <option value="">Select type...</option>
                                        {castSlotTypes.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Label</label>
                                    <input type="text" value={addSlotLabel}
                                        onChange={(e) => setAddSlotLabel(e.target.value)}
                                        placeholder="e.g. Guitar 1"
                                        className="bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 w-36 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Max</label>
                                    <input type="number" min={1} max={20} value={addSlotMax}
                                        onChange={(e) => setAddSlotMax(parseInt(e.target.value, 10) || 1)}
                                        className="w-16 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 text-center outline-none" />
                                </div>
                                <button type="button" onClick={handleAddSlot}
                                    disabled={!addSlotTypeId || !addSlotLabel.trim()}
                                    className="bg-[#cc0000] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#b30000] disabled:opacity-50 disabled:cursor-not-allowed">
                                    Add
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ─── Early returns ───────────────────────────────────────────────────────

    if (loadingGroups) return <div className="p-6 text-zinc-400 text-sm">Loading show groups...</div>;

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

    // ─── Main render ─────────────────────────────────────────────────────────

    return (
        <div className="p-6 space-y-6" style={{ backgroundColor: "#ffffff", minHeight: "100vh" }}>

            {/* Conflict override modal */}
            {overrideModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/70" onClick={() => setOverrideModal(null)} />
                    <div className="relative bg-[#1a1a1a] border border-zinc-700 p-6 max-w-sm mx-4 w-full">
                        <div className="text-base font-bold text-white mb-3">Conflict Override</div>
                        <p className="text-sm text-zinc-300">
                            This student is assigned to{" "}
                            <span className="text-white font-medium">&ldquo;{overrideModal.conflictSongTitle}&rdquo;</span>{" "}
                            in the other room during this pair. This conflict requires Music Director approval.
                        </p>
                        <div className="flex gap-3 mt-5">
                            <button type="button" onClick={() => setOverrideModal(null)}
                                className="px-4 py-2 text-sm border border-zinc-600 text-zinc-400 hover:text-white">
                                Cancel
                            </button>
                            <button type="button" onClick={handleConfirmOverride}
                                className="px-4 py-2 text-sm bg-orange-800 text-white hover:bg-orange-700">
                                Request Override
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page heading */}
            <div className="bg-[#111111] px-6 py-5">
                <div className="flex items-baseline gap-3">
                    <span className="font-bold text-2xl tracking-wide"
                        style={{ fontFamily: "var(--font-oswald)", color: "#cc0000" }}>CASTING</span>
                    <span className="font-bold italic text-2xl text-white"
                        style={{ fontFamily: "var(--font-oswald)" }}>TOOL</span>
                </div>
                <div className="mt-1 text-sm text-zinc-400">{schoolName}</div>
            </div>

            {/* SECTION 1 — Show Group Selector */}
            <div>
                <div className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">Select Show Group</div>
                <div className="flex flex-wrap gap-3">
                    {showGroups.map((group) => {
                        const isSelected = selectedGroupId === group.id;
                        const dayLabel = group.day_of_week
                            ? (DAY_LABELS[group.day_of_week.toLowerCase()] ?? group.day_of_week) : null;
                        const timeStr = group.start_time ? formatTime(group.start_time) : null;
                        return (
                            <button key={group.id} type="button"
                                onClick={() => setSelectedGroupId(group.id)}
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

            {/* Song management — only shown when a group is selected */}
            {selectedGroup && (
                <div className="space-y-5">

                    {/* Summary line */}
                    {songs.length > 0 && (
                        <div className="text-sm text-zinc-500">
                            {[
                                `${songs.length} song${songs.length !== 1 ? "s" : ""}`,
                                summaryCounts["approved"]  ? `${summaryCounts["approved"]} approved`  : null,
                                summaryCounts["submitted"] ? `${summaryCounts["submitted"]} submitted` : null,
                                summaryCounts["returned"]  ? `${summaryCounts["returned"]} returned`  : null,
                                summaryCounts["draft"]     ? `${summaryCounts["draft"]} draft`         : null,
                            ].filter(Boolean).join(" · ")}
                        </div>
                    )}

                    {/* Add Songs button + panel */}
                    <div>
                        <button type="button" onClick={() => setAddSongsOpen((v) => !v)}
                            className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000]">
                            {addSongsOpen ? "✕ Close" : "+ Add Songs"}
                        </button>

                        {addSongsOpen && (
                            <div className="mt-3 border border-zinc-700 bg-[#111111] p-5">
                                {selectedGroup.show_theme_id ? (
                                    <>
                                        <div className="mb-3 text-sm font-medium text-zinc-300">
                                            Select songs to add from this show&apos;s theme:
                                        </div>
                                        {themeSongs.length === 0 ? (
                                            <div className="text-sm text-zinc-500">Loading theme songs...</div>
                                        ) : (
                                            <>
                                                <div className="space-y-0.5 max-h-80 overflow-y-auto">
                                                    {themeSongs.map((ts) => {
                                                        const alreadyAdded = songs.some(
                                                            (s) => s.title.toLowerCase() === ts.title.toLowerCase() &&
                                                                s.artist.toLowerCase() === ts.artist.toLowerCase()
                                                        );
                                                        return (
                                                            <label key={ts.id}
                                                                className={`flex items-center gap-3 px-3 py-2 ${
                                                                    alreadyAdded
                                                                        ? "opacity-40 cursor-not-allowed"
                                                                        : "cursor-pointer hover:bg-zinc-800"
                                                                }`}>
                                                                <input type="checkbox" disabled={alreadyAdded}
                                                                    checked={checkedThemeSongIds.has(ts.id)}
                                                                    onChange={(e) => {
                                                                        setCheckedThemeSongIds((prev) => {
                                                                            const next = new Set(prev);
                                                                            if (e.target.checked) next.add(ts.id);
                                                                            else next.delete(ts.id);
                                                                            return next;
                                                                        });
                                                                    }} />
                                                                <span className="flex-1 text-sm text-white">
                                                                    {ts.title}
                                                                    <span className="ml-2 text-zinc-400">· {ts.artist}</span>
                                                                </span>
                                                                {ts.has_method_lesson && (
                                                                    <span className="bg-green-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-green-200">
                                                                        METHOD APP
                                                                    </span>
                                                                )}
                                                                {alreadyAdded && (
                                                                    <span className="text-xs text-zinc-500">Already Added</span>
                                                                )}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                                <div className="mt-4">
                                                    <button type="button" onClick={handleAddThemeSongs}
                                                        disabled={checkedThemeSongIds.size === 0 || addingSongs}
                                                        className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000] disabled:opacity-50 disabled:cursor-not-allowed">
                                                        {addingSongs ? "Adding..." : `Add Selected (${checkedThemeSongIds.size})`}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-3 text-sm font-medium text-zinc-300">Add a song manually:</div>
                                        <div className="flex flex-wrap gap-3 items-end">
                                            <div>
                                                <label className="block text-xs text-zinc-500 mb-1">Title *</label>
                                                <input type="text" value={customTitle}
                                                    onChange={(e) => setCustomTitle(e.target.value)}
                                                    placeholder="Song title"
                                                    className="bg-zinc-800 border border-zinc-700 text-white px-3 py-2 text-sm w-48 outline-none focus:border-zinc-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-zinc-500 mb-1">Artist *</label>
                                                <input type="text" value={customArtist}
                                                    onChange={(e) => setCustomArtist(e.target.value)}
                                                    placeholder="Artist name"
                                                    className="bg-zinc-800 border border-zinc-700 text-white px-3 py-2 text-sm w-48 outline-none focus:border-zinc-500" />
                                            </div>
                                            <div className="flex items-center gap-2 pb-2">
                                                <input type="checkbox" id="customMethodLesson"
                                                    checked={customHasMethodLesson}
                                                    onChange={(e) => setCustomHasMethodLesson(e.target.checked)} />
                                                <label htmlFor="customMethodLesson"
                                                    className="text-xs text-zinc-400 cursor-pointer">
                                                    Has Method App lesson
                                                </label>
                                            </div>
                                            <button type="button" onClick={handleAddCustomSong}
                                                disabled={!customTitle.trim() || !customArtist.trim()}
                                                className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000] disabled:opacity-50 disabled:cursor-not-allowed">
                                                Add Song
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* SONG LIST with paired display model */}
                    {loadingSongs ? (
                        <div className="text-zinc-400 text-sm">Loading songs...</div>
                    ) : songs.length === 0 ? (
                        <div className="bg-[#111111] p-6 text-zinc-500 text-sm">
                            No songs added yet. Use &quot;+ Add Songs&quot; above.
                        </div>
                    ) : (() => {
                        let lastPairGroup: number | null | undefined = undefined;
                        const unpairedSorted = songs.filter((s) => s.pair_group === null)
                            .sort((a, b) => a.order_index - b.order_index);

                        return (
                            <div className="space-y-0">
                                {sortedSongs.map((song) => {
                                    const isNewPairGroup = song.pair_group !== null && song.pair_group !== lastPairGroup;
                                    const showSeparator = isNewPairGroup && lastPairGroup !== undefined;
                                    const isFirstInPair = isNewPairGroup && song.pair_group !== null;
                                    const prevPairGroup = lastPairGroup;
                                    lastPairGroup = song.pair_group;

                                    const pairColor = song.pair_group ? getPairColor(song.pair_group) : null;
                                    const statusStyle = castingStatusStyle(song.casting_status);
                                    const isSlotExpanded = expandedSlotSongId === song.id;
                                    const isConfirmingRemove = removingSongId === song.id;
                                    const isPaired = song.pair_group !== null;

                                    // For unpaired song reordering
                                    const unpairedIdx = !isPaired
                                        ? unpairedSorted.findIndex((s) => s.id === song.id)
                                        : -1;
                                    const isFirstUnpaired = unpairedIdx === 0;
                                    const isLastUnpaired = unpairedIdx === unpairedSorted.length - 1;

                                    // Pair reorder eligibility
                                    const pairIdx = isPaired
                                        ? sortedPairGroups.indexOf(song.pair_group as number)
                                        : -1;

                                    return (
                                        <Fragment key={song.id}>
                                            {/* Separator between pair groups */}
                                            {showSeparator && prevPairGroup !== undefined && (
                                                <div className="border-t border-zinc-800 my-3" />
                                            )}
                                            {/* Separator between paired section and unpaired section */}
                                            {song.pair_group === null && lastPairGroup === null &&
                                                sortedSongs.findIndex((s) => s.id === song.id) > 0 &&
                                                sortedSongs[sortedSongs.findIndex((s) => s.id === song.id) - 1].pair_group !== null && (
                                                    <div className="border-t border-zinc-800 my-3" />
                                                )}

                                            {/* Song tile */}
                                            <div className="bg-[#1a1a1a] border border-zinc-800 mb-0.5"
                                                style={pairColor ? { borderLeftWidth: 4, borderLeftColor: pairColor } : {}}>
                                                <div className="flex items-start gap-3 p-4">

                                                    {/* Reorder controls */}
                                                    <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0 w-8">
                                                        {isPaired && isFirstInPair ? (
                                                            <>
                                                                <button type="button"
                                                                    onClick={() => handleReorderPair(song.pair_group as number, "up")}
                                                                    disabled={pairIdx <= 0}
                                                                    className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 text-xs hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    title="Move pair up">▲</button>
                                                                <button type="button"
                                                                    onClick={() => handleReorderPair(song.pair_group as number, "down")}
                                                                    disabled={pairIdx >= sortedPairGroups.length - 1}
                                                                    className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 text-xs hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    title="Move pair down">▼</button>
                                                            </>
                                                        ) : isPaired && !isFirstInPair ? (
                                                            // Second song of pair — no buttons, just spacing
                                                            <div className="h-10" />
                                                        ) : (
                                                            // Unpaired song
                                                            <>
                                                                <button type="button"
                                                                    onClick={() => handleReorderUnpaired(song.id, "up")}
                                                                    disabled={isFirstUnpaired}
                                                                    className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 text-xs hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    title="Move up">▲</button>
                                                                <button type="button"
                                                                    onClick={() => handleReorderUnpaired(song.id, "down")}
                                                                    disabled={isLastUnpaired}
                                                                    className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 text-xs hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    title="Move down">▼</button>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Song info + controls */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-bold text-white text-sm">{song.title}</span>
                                                            <span className="text-zinc-400 text-sm">· {song.artist}</span>
                                                            {song.has_method_lesson && (
                                                                <span className="bg-green-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-green-200">
                                                                    METHOD APP
                                                                </span>
                                                            )}
                                                            {pairColor && song.pair_group && (
                                                                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wide font-bold"
                                                                    style={{ color: pairColor, backgroundColor: pairColor + "22" }}>
                                                                    PAIR {song.pair_group}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="mt-2 flex flex-wrap items-center gap-4">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs text-zinc-500">Room:</span>
                                                                <select value={song.rehearsal_room_id ?? ""}
                                                                    onChange={(e) => handleRoomChange(song.id, e.target.value)}
                                                                    className="bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1 outline-none">
                                                                    <option value="">— none —</option>
                                                                    {rooms.map((r) => (
                                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs text-zinc-500 cursor-help"
                                                                    title="Songs with the same pair number rehearse simultaneously in different rooms">
                                                                    Pair:
                                                                </span>
                                                                <input type="number" min={1} max={20}
                                                                    value={song.pair_group ?? ""}
                                                                    onChange={(e) => handlePairGroupChange(song.id, e.target.value)}
                                                                    placeholder="—"
                                                                    className="w-16 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1 text-center outline-none" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right: status + buttons */}
                                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                                        <span className={`${statusStyle.bg} px-2 py-0.5 text-[10px] uppercase tracking-wide text-white font-bold`}>
                                                            {statusStyle.label}
                                                        </span>
                                                        <div className="flex gap-1.5">
                                                            <button type="button" onClick={() => handleToggleSlots(song.id)}
                                                                className={`px-3 py-1 text-xs font-medium border ${
                                                                    isSlotExpanded
                                                                        ? "bg-zinc-700 border-zinc-600 text-white"
                                                                        : "bg-transparent border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-white"
                                                                }`}>
                                                                Slots
                                                            </button>
                                                            {isConfirmingRemove ? (
                                                                <>
                                                                    <button type="button" onClick={() => handleRemoveSong(song.id)}
                                                                        className="px-3 py-1 text-xs font-medium bg-[#cc0000] text-white hover:bg-[#b30000]">
                                                                        Confirm
                                                                    </button>
                                                                    <button type="button" onClick={() => setRemovingSongId(null)}
                                                                        className="px-3 py-1 text-xs border border-zinc-600 text-zinc-400 hover:text-white">
                                                                        Cancel
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button type="button" onClick={() => setRemovingSongId(song.id)}
                                                                    className="px-3 py-1 text-xs border border-[#cc0000] text-[#cc0000] hover:bg-[#cc0000] hover:text-white">
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Slot editor */}
                                            {isSlotExpanded && renderSlotEditor(song)}
                                        </Fragment>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* CASTING EQUITY PANEL */}
                    {enrolledStudents.length > 0 && (
                        <div className="bg-[#111111] border border-zinc-800">
                            <button type="button"
                                onClick={() => setEquityOpen((v) => !v)}
                                className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-zinc-300 hover:text-white">
                                <span>{equityOpen ? "Hide Casting Equity" : "Show Casting Equity"}</span>
                                <span className="text-zinc-500">{equityOpen ? "▲" : "▼"}</span>
                            </button>

                            {equityOpen && (
                                <div className="border-t border-zinc-800 px-5 pb-5 pt-3">
                                    <div className="text-xs text-zinc-500 mb-3">
                                        Avg: {equityStats.avg.toFixed(1)} slots · Min: {equityStats.min} · Max: {equityStats.max}
                                    </div>
                                    <div className="space-y-2">
                                        {equityData.map(({ student, count }) => {
                                            const belowWarning = count > 0 && count < equityStats.avg - 2;
                                            const indicator = count === 0 ? "🔴" : belowWarning ? "🟡" : "🟢";
                                            const barPct = equityStats.max > 0
                                                ? Math.round((count / equityStats.max) * 100) : 0;
                                            return (
                                                <div key={student.id} className="flex items-center gap-3">
                                                    <span className="text-sm text-white w-32 shrink-0 truncate">
                                                        {getStudentDisplayName(student)}
                                                    </span>
                                                    <span className="bg-zinc-700 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400 shrink-0">
                                                        {student.instrument}
                                                    </span>
                                                    <div className="flex-1 bg-zinc-800 h-2">
                                                        <div className="h-2 bg-[#cc0000]"
                                                            style={{ width: `${barPct}%` }} />
                                                    </div>
                                                    <span className="text-xs text-zinc-400 w-6 text-right shrink-0">
                                                        {count}
                                                    </span>
                                                    <span className="shrink-0">{indicator}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SUBMISSION WORKFLOW */}
                    <div className="bg-[#111111] border border-zinc-800 p-5">
                        <div className="text-sm font-medium text-zinc-300 mb-3">Submission Status</div>

                        {/* Status breakdown */}
                        <div className="flex flex-wrap gap-3 mb-4">
                            {["draft", "submitted", "approved", "returned"].map((status) => {
                                const count = summaryCounts[status] ?? 0;
                                if (count === 0) return null;
                                const style = castingStatusStyle(status);
                                return (
                                    <span key={status} className={`${style.bg} px-3 py-1 text-xs text-white font-medium`}>
                                        {style.label}: {count}
                                    </span>
                                );
                            })}
                            {songs.length === 0 && (
                                <span className="text-xs text-zinc-500">No songs yet.</span>
                            )}
                        </div>

                        {/* Submit casting button */}
                        {(summaryCounts["draft"] ?? 0) > 0 && (
                            <div>
                                {!submitOpen ? (
                                    <button type="button" onClick={handleOpenSubmit}
                                        className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000]">
                                        Submit Casting for Approval
                                    </button>
                                ) : (
                                    <div className="border border-zinc-700 p-4">
                                        <div className="text-sm text-zinc-300 mb-3">
                                            Select songs to submit:
                                        </div>
                                        <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
                                            {songs.filter((s) => s.casting_status === "draft").map((song) => (
                                                <label key={song.id}
                                                    className="flex items-center gap-3 px-2 py-1.5 cursor-pointer hover:bg-zinc-800">
                                                    <input type="checkbox"
                                                        checked={submitCheckedSongIds.has(song.id)}
                                                        onChange={(e) => {
                                                            setSubmitCheckedSongIds((prev) => {
                                                                const next = new Set(prev);
                                                                if (e.target.checked) next.add(song.id);
                                                                else next.delete(song.id);
                                                                return next;
                                                            });
                                                        }} />
                                                    <span className="text-sm text-white">{song.title}</span>
                                                    <span className="text-zinc-400 text-sm">· {song.artist}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={handleSubmitCasting}
                                                disabled={submitCheckedSongIds.size === 0}
                                                className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000] disabled:opacity-50 disabled:cursor-not-allowed">
                                                Submit Selected for Approval ({submitCheckedSongIds.size})
                                            </button>
                                            <button type="button"
                                                onClick={() => { setSubmitOpen(false); setSubmitCheckedSongIds(new Set()); }}
                                                className="px-4 py-2 text-sm border border-zinc-600 text-zinc-400 hover:text-white">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* MD APPROVAL SECTION (music_director / gm / owner only) */}
                    {canApprove && (summaryCounts["submitted"] ?? 0) > 0 && (
                        <div className="bg-[#111111] border border-zinc-800 p-5">
                            <div className="text-sm font-medium text-zinc-300 mb-4">
                                Pending Approval — {summaryCounts["submitted"]} song{summaryCounts["submitted"] !== 1 ? "s" : ""}
                            </div>
                            <div className="space-y-3">
                                {songs.filter((s) => s.casting_status === "submitted").map((song) => {
                                    const songAssignments = castAssignments.filter((a) => a.song_id === song.id);
                                    const isReturning = returningNotesSongId === song.id;
                                    return (
                                        <div key={song.id} className="border border-zinc-700 p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className="font-medium text-white text-sm">{song.title}</div>
                                                    <div className="text-xs text-zinc-400">· {song.artist}</div>
                                                    {songAssignments.length > 0 && (
                                                        <div className="mt-2 text-xs text-zinc-500">
                                                            {songAssignments.length} student{songAssignments.length !== 1 ? "s" : ""} assigned
                                                            {songAssignments.some((a) => a.is_conflict_override) && (
                                                                <span className="ml-2 text-orange-400">· has conflict override</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {!isReturning && (
                                                    <div className="flex gap-2 shrink-0">
                                                        <button type="button" onClick={() => handleApproveSong(song.id)}
                                                            className="px-3 py-1.5 text-xs bg-green-700 text-white hover:bg-green-600">
                                                            Approve
                                                        </button>
                                                        <button type="button" onClick={() => {
                                                            setReturningNotesSongId(song.id);
                                                            setReturnNotesText("");
                                                        }}
                                                            className="px-3 py-1.5 text-xs border border-zinc-600 text-zinc-400 hover:text-white">
                                                            Return
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {isReturning && (
                                                <div className="mt-3">
                                                    <textarea value={returnNotesText}
                                                        onChange={(e) => setReturnNotesText(e.target.value)}
                                                        placeholder="Notes for instructor..."
                                                        rows={2}
                                                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 outline-none resize-none" />
                                                    <div className="flex gap-2 mt-2">
                                                        <button type="button" onClick={() => handleReturnSong(song.id)}
                                                            className="px-3 py-1.5 text-xs bg-[#cc0000] text-white hover:bg-[#b30000]">
                                                            Return to Instructor
                                                        </button>
                                                        <button type="button" onClick={() => { setReturningNotesSongId(null); setReturnNotesText(""); }}
                                                            className="px-3 py-1.5 text-xs border border-zinc-600 text-zinc-400 hover:text-white">
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
