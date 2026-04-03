"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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
    song_id: string;
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
    existingAssignmentId?: string;
    songId: string;
};

type CastingViewProps = {
    currentUser: SessionUser | null;
    schoolId: string;
    schoolName: string;
    students: StudentRow[];
};

// ─── Constants ─────────────────────────────────────────────────────────────

const PAIR_COLORS = [
    "#3b82f6", "#a855f7", "#f59e0b",
    "#10b981", "#f97316", "#ec4899",
];

const SLOT_COLUMN_ORDER = [
    "Drums", "Bass", "Lead Vocals", "Guitar 1", "Guitar 2", "Guitar 3",
    "Keys 1", "Keys 2", "Harmony Vox", "BV 1", "BV 2",
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

function sortColumns(labels: string[]): string[] {
    return [...labels].sort((a, b) => {
        const ai = SLOT_COLUMN_ORDER.indexOf(a);
        const bi = SLOT_COLUMN_ORDER.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b);
    });
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function CastingView({ currentUser, schoolId, schoolName, students }: CastingViewProps) {
    const role = currentUser?.role ?? "";
    const canApprove = role === "music_director" || role === "general_manager" || role === "owner";

    // Show groups
    const [showGroups, setShowGroups] = useState<ShowGroup[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    // Song / room / type data
    const [songs, setSongs] = useState<Song[]>([]);
    const [loadingSongs, setLoadingSongs] = useState(false);
    const [rooms, setRooms] = useState<RehearsalRoom[]>([]);
    const [castSlotTypes, setCastSlotTypes] = useState<CastSlotType[]>([]);

    // All slots for all songs keyed by song id
    const [allSlots, setAllSlots] = useState<Record<string, CastSlot[]>>({});

    // Memberships + assignments
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [castAssignments, setCastAssignments] = useState<CastAssignment[]>([]);

    // Slot editor panel (right drawer)
    const [slotEditorSongId, setSlotEditorSongId] = useState<string | null>(null);
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
                            season_id: row.season_id,
                            show_theme_id: row.show_theme_id,
                            theme_type_id: row.theme_type_id,
                            status: row.status,
                            day_of_week: row.day_of_week,
                            start_time: row.start_time,
                            end_time: row.end_time,
                            class_instructor_id: row.class_instructor_id,
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

    useEffect(() => {
        supabase
            .from("cast_slot_types")
            .select("id, name, slot_category")
            .order("name")
            .then(({ data }) => {
                if (data) setCastSlotTypes(data as CastSlotType[]);
            });
    }, []);

    const loadAllSlots = useCallback(async (songIds: string[]) => {
        if (songIds.length === 0) { setAllSlots({}); return; }
        const { data } = await supabase
            .from("show_song_cast_slots")
            .select("id, show_group_song_id, cast_slot_type_id, slot_label, max_students, order_index, cast_slot_types(name)")
            .in("show_group_song_id", songIds)
            .order("order_index", { ascending: true });
        if (data) {
            const grouped: Record<string, CastSlot[]> = {};
            for (const row of data as any[]) {
                const sid = row.show_group_song_id;
                if (!grouped[sid]) grouped[sid] = [];
                grouped[sid].push({
                    id: row.id,
                    show_group_song_id: row.show_group_song_id,
                    cast_slot_type_id: row.cast_slot_type_id,
                    slot_label: row.slot_label,
                    max_students: row.max_students,
                    order_index: row.order_index,
                    type_name: (row.cast_slot_types as any)?.name ?? "",
                });
            }
            setAllSlots(grouped);
        }
    }, []);

    const loadCastAssignments = useCallback(async (songIds: string[]) => {
        if (songIds.length === 0) { setCastAssignments([]); return; }
        const { data: slotData } = await supabase
            .from("show_song_cast_slots")
            .select("id, show_group_song_id")
            .in("show_group_song_id", songIds);
        if (!slotData || slotData.length === 0) { setCastAssignments([]); return; }
        const slotToSongMap: Record<string, string> = {};
        for (const s of slotData as any[]) slotToSongMap[s.id] = s.show_group_song_id;
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
            setCastAssignments([]); setAllSlots({});
            setSlotEditorSongId(null); setAddSongsOpen(false);
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
            await Promise.all([
                loadAllSlots(songData.map((s) => s.id)),
                loadCastAssignments(songData.map((s) => s.id)),
            ]);
            setLoadingSongs(false);
        }
        load();
    }, [selectedGroupId, schoolId, loadAllSlots, loadCastAssignments]);

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
        () => [...songs].sort((a, b) => a.order_index - b.order_index),
        [songs]
    );

    const gridColumns = useMemo(() => {
        const allLabels = new Set<string>();
        for (const slots of Object.values(allSlots)) {
            for (const slot of slots) allLabels.add(slot.slot_label);
        }
        return sortColumns([...allLabels]);
    }, [allSlots]);

    const enrolledStudents = useMemo(
        () => memberships
            .map((m) => students.find((s) => s.id === m.student_id))
            .filter(Boolean) as StudentRow[],
        [memberships, students]
    );

    const equityData = useMemo(
        () => enrolledStudents
            .map((student) => ({
                student,
                count: castAssignments.filter((a) => a.student_id === student.id).length,
            }))
            .sort((a, b) => b.count - a.count),
        [enrolledStudents, castAssignments]
    );

    const equityStats = useMemo(() => {
        if (equityData.length === 0) return { avg: 0, min: 0, max: 0 };
        const counts = equityData.map((d) => d.count);
        return {
            avg: counts.reduce((s, c) => s + c, 0) / counts.length,
            min: Math.min(...counts),
            max: Math.max(...counts),
        };
    }, [equityData]);

    const summaryCounts = useMemo(
        () => songs.reduce((acc, s) => {
            acc[s.casting_status] = (acc[s.casting_status] ?? 0) + 1; return acc;
        }, {} as Record<string, number>),
        [songs]
    );

    // ─── Conflict helpers ───────────────────────────────────────────────────

    function getConflictedStudentIds(song: Song): Map<string, string> {
        const result = new Map<string, string>();
        if (!song.pair_group) return result;
        const pairedSongs = songs.filter(
            (s) => s.pair_group === song.pair_group && s.id !== song.id
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

    // ─── Drag and drop ──────────────────────────────────────────────────────

    function handleDragEnd(result: any) {
        if (!result.destination) return;
        const srcIdx = result.source.index;
        const dstIdx = result.destination.index;
        if (srcIdx === dstIdx) return;
        const newSongs = Array.from(sortedSongs);
        const [moved] = newSongs.splice(srcIdx, 1);
        newSongs.splice(dstIdx, 0, moved);
        const updated = newSongs.map((s, i) => ({ ...s, order_index: i + 1 }));
        setSongs(updated);
        Promise.all(
            updated.map((s) =>
                supabase.from("show_group_songs").update({ order_index: s.order_index }).eq("id", s.id)
            )
        );
    }

    // ─── Song management ────────────────────────────────────────────────────

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
            if (slotEditorSongId === songId) setSlotEditorSongId(null);
            setRemovingSongId(null);
            const ids = remaining.map((s) => s.id);
            await Promise.all([loadAllSlots(ids), loadCastAssignments(ids)]);
        }
    }

    // ─── Slot management ────────────────────────────────────────────────────

    async function handleAddSlot() {
        if (!slotEditorSongId || !addSlotTypeId || !addSlotLabel.trim()) return;
        const songSlots = allSlots[slotEditorSongId] ?? [];
        const nextOrder = songSlots.length > 0
            ? Math.max(...songSlots.map((s) => s.order_index)) + 1 : 1;
        const { data, error } = await supabase.from("show_song_cast_slots")
            .insert({
                show_group_song_id: slotEditorSongId,
                cast_slot_type_id: addSlotTypeId,
                slot_label: addSlotLabel.trim(),
                max_students: addSlotMax,
                order_index: nextOrder,
            })
            .select("id, show_group_song_id, cast_slot_type_id, slot_label, max_students, order_index, cast_slot_types(name)")
            .single();
        if (!error && data) {
            const d = data as any;
            const newSlot: CastSlot = {
                id: d.id,
                show_group_song_id: d.show_group_song_id,
                cast_slot_type_id: d.cast_slot_type_id,
                slot_label: d.slot_label,
                max_students: d.max_students,
                order_index: d.order_index,
                type_name: d.cast_slot_types?.name ?? "",
            };
            setAllSlots((prev) => ({
                ...prev,
                [slotEditorSongId]: [...(prev[slotEditorSongId] ?? []), newSlot],
            }));
            setAddSlotTypeId(""); setAddSlotLabel(""); setAddSlotMax(1);
        }
    }

    async function handleRemoveSlot(slotId: string, songId: string) {
        const { error } = await supabase.from("show_song_cast_slots").delete().eq("id", slotId);
        if (!error) {
            setAllSlots((prev) => ({
                ...prev,
                [songId]: (prev[songId] ?? []).filter((s) => s.id !== slotId),
            }));
            setCastAssignments((prev) => prev.filter((a) => a.show_song_cast_slot_id !== slotId));
        }
    }

    // ─── Grid assignment handler ─────────────────────────────────────────────

    async function handleGridCellChange(slot: CastSlot, newStudentId: string, song: Song) {
        const existing = castAssignments.find((a) => a.show_song_cast_slot_id === slot.id);
        if (newStudentId === (existing?.student_id ?? "")) return;

        if (newStudentId === "") {
            if (existing) {
                await supabase.from("show_song_cast_assignments").delete().eq("id", existing.id);
                setCastAssignments((prev) => prev.filter((a) => a.id !== existing.id));
            }
            return;
        }

        const conflictMap = getConflictedStudentIds(song);
        if (conflictMap.has(newStudentId)) {
            setOverrideModal({
                slotId: slot.id,
                studentId: newStudentId,
                conflictSongTitle: conflictMap.get(newStudentId) ?? "",
                existingAssignmentId: existing?.id,
                songId: song.id,
            });
            return;
        }

        if (existing) {
            const { error } = await supabase.from("show_song_cast_assignments")
                .update({ student_id: newStudentId, is_conflict_override: false })
                .eq("id", existing.id);
            if (!error) {
                setCastAssignments((prev) =>
                    prev.map((a) => a.id === existing.id
                        ? { ...a, student_id: newStudentId, is_conflict_override: false } : a)
                );
            }
        } else {
            const { data, error } = await supabase.from("show_song_cast_assignments")
                .insert({
                    show_song_cast_slot_id: slot.id,
                    student_id: newStudentId,
                    status: "active",
                    is_conflict_override: false,
                })
                .select("id").single();
            if (!error && data) {
                setCastAssignments((prev) => [...prev, {
                    id: (data as any).id,
                    show_song_cast_slot_id: slot.id,
                    student_id: newStudentId,
                    status: "active",
                    is_conflict_override: false,
                    override_reason: null,
                    override_approved_by: null,
                    song_id: song.id,
                }]);
            }
        }
    }

    async function handleConfirmOverride() {
        if (!overrideModal) return;
        const { existingAssignmentId, slotId, studentId, songId } = overrideModal;
        if (existingAssignmentId) {
            const { error } = await supabase.from("show_song_cast_assignments")
                .update({ student_id: studentId, is_conflict_override: true })
                .eq("id", existingAssignmentId);
            if (!error) {
                setCastAssignments((prev) =>
                    prev.map((a) => a.id === existingAssignmentId
                        ? { ...a, student_id: studentId, is_conflict_override: true } : a)
                );
            }
        } else {
            const { data, error } = await supabase.from("show_song_cast_assignments")
                .insert({
                    show_song_cast_slot_id: slotId,
                    student_id: studentId,
                    status: "active",
                    is_conflict_override: true,
                })
                .select("id").single();
            if (!error && data) {
                setCastAssignments((prev) => [...prev, {
                    id: (data as any).id,
                    show_song_cast_slot_id: slotId,
                    student_id: studentId,
                    status: "active",
                    is_conflict_override: true,
                    override_reason: null,
                    override_approved_by: null,
                    song_id: songId,
                }]);
            }
        }
        setOverrideModal(null);
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
                        show_group_song_id: (newSong as any).id,
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
            const rs = refreshed as Song[];
            setSongs(rs);
            const ids = rs.map((s) => s.id);
            await Promise.all([loadAllSlots(ids), loadCastAssignments(ids)]);
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
            const ids = updated.map((s) => s.id);
            await Promise.all([loadAllSlots(ids), loadCastAssignments(ids)]);
            setCustomTitle(""); setCustomArtist(""); setCustomHasMethodLesson(false);
        }
    }

    // ─── Submit / approval handlers ─────────────────────────────────────────

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
                s.id === songId
                    ? { ...s, casting_status: "returned", notes: returnNotesText.trim() || null }
                    : s
            ));
            setReturningNotesSongId(null); setReturnNotesText("");
        }
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

    const slotEditorSong = slotEditorSongId ? songs.find((s) => s.id === slotEditorSongId) ?? null : null;
    const slotEditorSlots = slotEditorSongId ? (allSlots[slotEditorSongId] ?? []) : [];

    // ─── Main render ─────────────────────────────────────────────────────────

    return (
        <div style={{ backgroundColor: "#ffffff", minHeight: "100vh" }}>

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

            {/* Slot editor panel — right drawer */}
            {slotEditorSongId && slotEditorSong && (
                <div className="fixed inset-0 z-40">
                    <div className="absolute inset-0 bg-black/50"
                        onClick={() => { setSlotEditorSongId(null); setAddSlotTypeId(""); setAddSlotLabel(""); setAddSlotMax(1); }} />
                    <div className="absolute right-0 top-0 h-full w-[360px] bg-[#111111] border-l border-zinc-800 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
                            <div>
                                <div className="text-sm font-bold text-white">{slotEditorSong.title}</div>
                                <div className="text-xs text-zinc-400">{slotEditorSong.artist}</div>
                            </div>
                            <button type="button"
                                onClick={() => { setSlotEditorSongId(null); setAddSlotTypeId(""); setAddSlotLabel(""); setAddSlotMax(1); }}
                                className="text-zinc-400 hover:text-white text-2xl leading-none w-8 text-center">×</button>
                        </div>

                        {/* Song settings */}
                        <div className="px-5 py-4 border-b border-zinc-800 shrink-0 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-zinc-500 w-16 shrink-0">Room</span>
                                <select value={slotEditorSong.rehearsal_room_id ?? ""}
                                    onChange={(e) => handleRoomChange(slotEditorSong.id, e.target.value)}
                                    className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 outline-none">
                                    <option value="">— none —</option>
                                    {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-zinc-500 w-16 shrink-0">Pair #</span>
                                <input type="number" min={1} max={20}
                                    value={slotEditorSong.pair_group ?? ""}
                                    onChange={(e) => handlePairGroupChange(slotEditorSong.id, e.target.value)}
                                    placeholder="—"
                                    className="w-20 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 text-center outline-none" />
                                <span className="text-xs text-zinc-600">Songs with the same pair # are in different rooms simultaneously</span>
                            </div>
                        </div>

                        {/* Slots list */}
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Cast Slots</div>
                            {slotEditorSlots.length === 0 ? (
                                <div className="text-xs text-zinc-500">No cast slots yet.</div>
                            ) : (
                                <div className="space-y-1.5 mb-4">
                                    {slotEditorSlots.map((slot) => {
                                        const assignCount = castAssignments.filter(
                                            (a) => a.show_song_cast_slot_id === slot.id
                                        ).length;
                                        return (
                                            <div key={slot.id} className="bg-zinc-900 px-3 py-2 flex items-center gap-2">
                                                <span className="flex-1 text-sm text-white">{slot.slot_label}</span>
                                                {slot.type_name && (
                                                    <span className="bg-zinc-700 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">
                                                        {slot.type_name}
                                                    </span>
                                                )}
                                                <span className="text-xs text-zinc-500">max {slot.max_students}</span>
                                                {assignCount > 0 && (
                                                    <span className="text-xs text-zinc-400">{assignCount} cast</span>
                                                )}
                                                <button type="button"
                                                    onClick={() => handleRemoveSlot(slot.id, slotEditorSongId)}
                                                    className="text-[#cc0000] hover:text-white text-xl leading-none ml-1 w-5 text-center">×</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Add slot form */}
                            <div className="border-t border-zinc-800 pt-4">
                                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Add Slot</div>
                                <div className="space-y-2">
                                    <select value={addSlotTypeId}
                                        onChange={(e) => {
                                            const typeId = e.target.value;
                                            setAddSlotTypeId(typeId);
                                            setAddSlotLabel(castSlotTypes.find((t) => t.id === typeId)?.name ?? "");
                                        }}
                                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 outline-none">
                                        <option value="">Select type...</option>
                                        {castSlotTypes.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <input type="text" value={addSlotLabel}
                                        onChange={(e) => setAddSlotLabel(e.target.value)}
                                        placeholder="Label (e.g. Guitar 1)"
                                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 outline-none" />
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-zinc-500">Max students:</label>
                                        <input type="number" min={1} max={20} value={addSlotMax}
                                            onChange={(e) => setAddSlotMax(parseInt(e.target.value, 10) || 1)}
                                            className="w-16 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 text-center outline-none" />
                                    </div>
                                    <button type="button" onClick={handleAddSlot}
                                        disabled={!addSlotTypeId || !addSlotLabel.trim()}
                                        className="w-full bg-[#cc0000] text-white py-2 text-xs font-medium hover:bg-[#b30000] disabled:opacity-50 disabled:cursor-not-allowed">
                                        Add Slot
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Remove song */}
                        <div className="px-5 py-4 border-t border-zinc-800 shrink-0">
                            {removingSongId === slotEditorSongId ? (
                                <div className="flex gap-2 items-center">
                                    <span className="text-xs text-zinc-400 flex-1">Remove this song and all assignments?</span>
                                    <button type="button" onClick={() => handleRemoveSong(slotEditorSongId)}
                                        className="text-xs bg-[#cc0000] text-white px-3 py-1 hover:bg-[#b30000]">Yes</button>
                                    <button type="button" onClick={() => setRemovingSongId(null)}
                                        className="text-xs border border-zinc-600 text-zinc-400 px-3 py-1 hover:text-white">No</button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => setRemovingSongId(slotEditorSongId)}
                                    className="text-xs text-[#cc0000] hover:text-white">
                                    Remove song from setlist
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 space-y-6">

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

                {selectedGroup && (
                    <div className="space-y-5">

                        {/* SECTION 2 — Add Songs */}
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
                                                                        <span className="text-xs text-zinc-500">Added</span>
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
                                                        className="bg-zinc-800 border border-zinc-700 text-white px-3 py-2 text-sm w-48 outline-none" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-zinc-500 mb-1">Artist *</label>
                                                    <input type="text" value={customArtist}
                                                        onChange={(e) => setCustomArtist(e.target.value)}
                                                        placeholder="Artist name"
                                                        className="bg-zinc-800 border border-zinc-700 text-white px-3 py-2 text-sm w-48 outline-none" />
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

                        {/* SECTION 3 — THE CASTING GRID */}
                        {loadingSongs ? (
                            <div className="text-zinc-400 text-sm">Loading songs...</div>
                        ) : songs.length === 0 ? (
                            <div className="bg-[#111111] p-6 text-zinc-500 text-sm">
                                No songs added yet. Use &quot;+ Add Songs&quot; above.
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <DragDropContext onDragEnd={handleDragEnd}>
                                    <table style={{ borderCollapse: "collapse", tableLayout: "auto" }}>
                                        <thead>
                                            <tr>
                                                {/* Room */}
                                                <th style={{
                                                    position: "sticky", left: 0, zIndex: 31,
                                                    backgroundColor: "#0a0a0a",
                                                    width: 100, minWidth: 100,
                                                    padding: "8px 10px",
                                                    textAlign: "left",
                                                    borderRight: "1px solid #27272a",
                                                    borderBottom: "1px solid #27272a",
                                                    whiteSpace: "nowrap",
                                                }}>
                                                    <span style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Room</span>
                                                </th>
                                                {/* Song */}
                                                <th style={{
                                                    position: "sticky", left: 100, zIndex: 30,
                                                    backgroundColor: "#0a0a0a",
                                                    width: 220, minWidth: 220,
                                                    padding: "8px 10px",
                                                    textAlign: "left",
                                                    borderRight: "1px solid #27272a",
                                                    borderBottom: "1px solid #27272a",
                                                    whiteSpace: "nowrap",
                                                }}>
                                                    <span style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Song</span>
                                                </th>
                                                {/* Slot columns */}
                                                {gridColumns.map((col) => (
                                                    <th key={col} style={{
                                                        minWidth: 140,
                                                        padding: "8px 8px",
                                                        textAlign: "left",
                                                        borderRight: "1px solid #1c1c1e",
                                                        borderBottom: "1px solid #27272a",
                                                        backgroundColor: "#0a0a0a",
                                                        whiteSpace: "nowrap",
                                                    }}>
                                                        <span style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-oswald)" }}>
                                                            {col}
                                                        </span>
                                                    </th>
                                                ))}
                                                {/* Actions */}
                                                <th style={{
                                                    width: 50, minWidth: 50,
                                                    padding: "8px 4px",
                                                    borderBottom: "1px solid #27272a",
                                                    backgroundColor: "#0a0a0a",
                                                }} />
                                            </tr>
                                        </thead>

                                        <Droppable droppableId="songs-table" type="TABLE_ROW">
                                            {(droppableProvided) => (
                                                <tbody
                                                    ref={droppableProvided.innerRef}
                                                    {...droppableProvided.droppableProps}
                                                >
                                                    {sortedSongs.map((song, index) => {
                                                        const pairColor = song.pair_group ? getPairColor(song.pair_group) : null;
                                                        const statusStyle = castingStatusStyle(song.casting_status);
                                                        const room = rooms.find((r) => r.id === song.rehearsal_room_id);
                                                        const songSlots = allSlots[song.id] ?? [];
                                                        const rowBg = index % 2 === 1 ? "#161616" : "#1a1a1a";

                                                        return (
                                                            <Draggable key={song.id} draggableId={song.id} index={index}>
                                                                {(dragProvided, snapshot) => (
                                                                    <tr
                                                                        ref={dragProvided.innerRef}
                                                                        {...dragProvided.draggableProps}
                                                                        style={{
                                                                            ...dragProvided.draggableProps.style,
                                                                            backgroundColor: snapshot.isDragging ? "#2a2a2a" : rowBg,
                                                                        }}
                                                                    >
                                                                        {/* Room cell (sticky) */}
                                                                        <td style={{
                                                                            position: "sticky", left: 0, zIndex: 20,
                                                                            backgroundColor: snapshot.isDragging ? "#2a2a2a" : rowBg,
                                                                            width: 100, minWidth: 100,
                                                                            padding: "6px 10px",
                                                                            borderRight: "1px solid #27272a",
                                                                            borderBottom: "1px solid #1c1c1e",
                                                                            verticalAlign: "middle",
                                                                            ...(pairColor ? { borderLeft: `4px solid ${pairColor}` } : { borderLeft: "4px solid transparent" }),
                                                                        }}>
                                                                            <span style={{ color: room ? "#a1a1aa" : "#52525b", fontSize: 12 }}>
                                                                                {room ? room.name : "—"}
                                                                            </span>
                                                                        </td>

                                                                        {/* Song cell (sticky) */}
                                                                        <td style={{
                                                                            position: "sticky", left: 100, zIndex: 19,
                                                                            backgroundColor: snapshot.isDragging ? "#2a2a2a" : rowBg,
                                                                            width: 220, minWidth: 220,
                                                                            padding: "6px 10px",
                                                                            borderRight: "1px solid #27272a",
                                                                            borderBottom: "1px solid #1c1c1e",
                                                                            verticalAlign: "middle",
                                                                        }}>
                                                                            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                                                                                <span
                                                                                    {...dragProvided.dragHandleProps}
                                                                                    style={{ color: "#52525b", cursor: "grab", fontSize: 13, lineHeight: "1.6", flexShrink: 0, userSelect: "none" }}>
                                                                                    ⠿
                                                                                </span>
                                                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
                                                                                        {index + 1}. {song.title}
                                                                                    </div>
                                                                                    <div style={{ fontSize: 11, color: "#71717a", marginTop: 1 }}>
                                                                                        {song.artist}
                                                                                    </div>
                                                                                    <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
                                                                                        {song.has_method_lesson && (
                                                                                            <span style={{ backgroundColor: "#166534", color: "#bbf7d0", fontSize: 9, padding: "1px 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                                                                                METHOD APP
                                                                                            </span>
                                                                                        )}
                                                                                        {song.pair_group && pairColor && (
                                                                                            <span style={{ color: pairColor, backgroundColor: pairColor + "22", fontSize: 9, padding: "1px 4px", textTransform: "uppercase", fontWeight: 700 }}>
                                                                                                PAIR {song.pair_group}
                                                                                            </span>
                                                                                        )}
                                                                                        <span className={statusStyle.bg} style={{ color: "#fff", fontSize: 9, padding: "1px 4px", textTransform: "uppercase" }}>
                                                                                            {statusStyle.label}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>

                                                                        {/* Slot cells */}
                                                                        {gridColumns.map((col) => {
                                                                            const slot = songSlots.find((s) => s.slot_label === col);
                                                                            if (!slot) {
                                                                                return (
                                                                                    <td key={col} style={{
                                                                                        minWidth: 140,
                                                                                        backgroundColor: "#0d0d0d",
                                                                                        borderRight: "1px solid #1c1c1e",
                                                                                        borderBottom: "1px solid #1c1c1e",
                                                                                    }} />
                                                                                );
                                                                            }
                                                                            const primaryAssignment = castAssignments.find(
                                                                                (a) => a.show_song_cast_slot_id === slot.id
                                                                            );
                                                                            const allAssignments = castAssignments.filter(
                                                                                (a) => a.show_song_cast_slot_id === slot.id
                                                                            );
                                                                            const extraCount = allAssignments.length - 1;
                                                                            const conflictMap = getConflictedStudentIds(song);
                                                                            const isConflictCell = primaryAssignment?.is_conflict_override ?? false;

                                                                            return (
                                                                                <td key={col} style={{
                                                                                    minWidth: 140,
                                                                                    padding: "4px 4px",
                                                                                    borderRight: "1px solid #1c1c1e",
                                                                                    borderBottom: "1px solid #1c1c1e",
                                                                                    verticalAlign: "middle",
                                                                                    ...(isConflictCell ? { outline: "1px solid #f97316", outlineOffset: "-1px" } : {}),
                                                                                }}>
                                                                                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                                                                        <select
                                                                                            value={primaryAssignment?.student_id ?? ""}
                                                                                            onChange={(e) => handleGridCellChange(slot, e.target.value, song)}
                                                                                            style={{
                                                                                                flex: 1,
                                                                                                backgroundColor: "#0f0f0f",
                                                                                                color: "#fff",
                                                                                                fontSize: 12,
                                                                                                border: "1px solid #3f3f46",
                                                                                                borderRadius: 0,
                                                                                                padding: "3px 4px",
                                                                                                outline: "none",
                                                                                                width: "100%",
                                                                                                minWidth: 0,
                                                                                            }}>
                                                                                            <option value="">—</option>
                                                                                            {enrolledStudents.map((s) => {
                                                                                                const isConflict = conflictMap.has(s.id);
                                                                                                return (
                                                                                                    <option key={s.id} value={s.id}>
                                                                                                        {isConflict ? "⚠ " : ""}{getStudentDisplayName(s)} ({s.instrument}){isConflict ? " — conflict" : ""}
                                                                                                    </option>
                                                                                                );
                                                                                            })}
                                                                                        </select>
                                                                                        {extraCount > 0 && (
                                                                                            <button
                                                                                                type="button"
                                                                                                title={`+${extraCount} more — open slot editor`}
                                                                                                onClick={() => setSlotEditorSongId(song.id)}
                                                                                                style={{ fontSize: 10, color: "#a1a1aa", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", padding: "0 2px" }}>
                                                                                                +{extraCount}
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        })}

                                                                        {/* Actions cell */}
                                                                        <td style={{
                                                                            width: 50,
                                                                            padding: "4px 4px",
                                                                            borderBottom: "1px solid #1c1c1e",
                                                                            textAlign: "center",
                                                                            verticalAlign: "middle",
                                                                        }}>
                                                                            <button type="button"
                                                                                onClick={() => {
                                                                                    setSlotEditorSongId(song.id);
                                                                                    setAddSlotTypeId(""); setAddSlotLabel(""); setAddSlotMax(1);
                                                                                }}
                                                                                title="Edit slots, room, pair"
                                                                                style={{ color: "#71717a", fontSize: 13, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>
                                                                                ✎
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </Draggable>
                                                        );
                                                    })}
                                                    {droppableProvided.placeholder}
                                                </tbody>
                                            )}
                                        </Droppable>
                                    </table>
                                </DragDropContext>
                            </div>
                        )}

                        {/* SECTION 4 — CASTING EQUITY PANEL */}
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
                                            Avg: {equityStats.avg.toFixed(1)} · Min: {equityStats.min} · Max: {equityStats.max}
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
                                                            <div className="h-2 bg-[#cc0000]" style={{ width: `${barPct}%` }} />
                                                        </div>
                                                        <span className="text-xs text-zinc-400 w-6 text-right shrink-0">{count}</span>
                                                        <span className="shrink-0">{indicator}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SECTION 5 — SUBMISSION WORKFLOW */}
                        <div className="bg-[#111111] border border-zinc-800 p-5">
                            <div className="text-sm font-medium text-zinc-300 mb-3">Submission Status</div>
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
                                {songs.length === 0 && <span className="text-xs text-zinc-500">No songs yet.</span>}
                            </div>

                            {(summaryCounts["draft"] ?? 0) > 0 && (
                                <div>
                                    {!submitOpen ? (
                                        <button type="button" onClick={handleOpenSubmit}
                                            className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000]">
                                            Submit Casting for Approval
                                        </button>
                                    ) : (
                                        <div className="border border-zinc-700 p-4">
                                            <div className="text-sm text-zinc-300 mb-3">Select songs to submit:</div>
                                            <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
                                                {songs.filter((s) => s.casting_status === "draft").map((song) => (
                                                    <label key={song.id}
                                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 cursor-pointer">
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
                                                        <span className="text-xs text-zinc-400">· {song.artist}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={handleSubmitCasting}
                                                    disabled={submitCheckedSongIds.size === 0}
                                                    className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000] disabled:opacity-50 disabled:cursor-not-allowed">
                                                    Submit Selected ({submitCheckedSongIds.size})
                                                </button>
                                                <button type="button" onClick={() => setSubmitOpen(false)}
                                                    className="px-4 py-2 text-sm border border-zinc-600 text-zinc-400 hover:text-white">
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {canApprove && (summaryCounts["submitted"] ?? 0) > 0 && (
                                <div className="mt-5 border-t border-zinc-800 pt-5">
                                    <div className="text-sm font-medium text-zinc-300 mb-3">Casting for Review</div>
                                    <div className="space-y-3">
                                        {songs.filter((s) => s.casting_status === "submitted").map((song) => (
                                            <div key={song.id} className="bg-zinc-900 p-3">
                                                <div className="flex items-center justify-between flex-wrap gap-2">
                                                    <div>
                                                        <span className="text-sm font-medium text-white">{song.title}</span>
                                                        <span className="ml-2 text-xs text-zinc-400">· {song.artist}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {returningNotesSongId !== song.id ? (
                                                            <>
                                                                <button type="button" onClick={() => handleApproveSong(song.id)}
                                                                    className="bg-green-700 text-white px-3 py-1 text-xs font-medium hover:bg-green-600">
                                                                    Approve
                                                                </button>
                                                                <button type="button"
                                                                    onClick={() => { setReturningNotesSongId(song.id); setReturnNotesText(""); }}
                                                                    className="border border-zinc-600 text-zinc-400 px-3 py-1 text-xs hover:text-white">
                                                                    Return
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="flex gap-2 items-center flex-wrap">
                                                                <input type="text" value={returnNotesText}
                                                                    onChange={(e) => setReturnNotesText(e.target.value)}
                                                                    placeholder="Return notes..."
                                                                    className="bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1 w-48 outline-none" />
                                                                <button type="button" onClick={() => handleReturnSong(song.id)}
                                                                    className="bg-[#cc0000] text-white px-3 py-1 text-xs font-medium hover:bg-[#b30000]">
                                                                    Send
                                                                </button>
                                                                <button type="button"
                                                                    onClick={() => { setReturningNotesSongId(null); setReturnNotesText(""); }}
                                                                    className="text-xs text-zinc-500 hover:text-white px-1">✕</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {song.notes && (
                                                    <div className="mt-2 text-xs text-zinc-400 border-l border-zinc-700 pl-2">
                                                        {song.notes}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
